from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

feedback_bp = Blueprint("feedback", __name__)


@feedback_bp.route("/api/feedback", methods=["GET"])
def get_feedback():
    event_id = request.args.get("event_id")
    student_id = request.args.get("student_id")

    query = """
        SELECT
            F.FEEDBACK_ID, F.RATING, F.COMMENTS, F.SUBMITTED_DATE,
            S.STUDENT_ID, S.FULL_NAME, S.ROLL_NO,
            E.EVENT_ID, E.EVENT_TITLE,
            R.REGISTRATION_ID
        FROM FEEDBACK F
        JOIN STUDENT S ON F.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON F.EVENT_ID = E.EVENT_ID
        JOIN REGISTRATION R ON F.REGISTRATION_ID = R.REGISTRATION_ID
        WHERE 1=1
    """
    params = []

    if event_id:
        query += " AND F.EVENT_ID = %s"
        params.append(event_id)
    if student_id:
        query += " AND F.STUDENT_ID = %s"
        params.append(student_id)

    query += " ORDER BY F.SUBMITTED_DATE DESC"

    feedbacks = execute_query(query, params, fetch=True)

    # Aggregate rating stats per event if filtering by event
    result = {"success": True, "data": feedbacks, "count": len(feedbacks)}
    if event_id and feedbacks:
        ratings = [f["RATING"] for f in feedbacks if f["RATING"] is not None]
        if ratings:
            result["average_rating"] = round(sum(ratings) / len(ratings), 2)
            result["total_responses"] = len(ratings)

    return jsonify(result), 200


@feedback_bp.route("/api/feedback/<int:feedback_id>", methods=["GET"])
def get_single_feedback(feedback_id):
    feedback = execute_query(
        """
        SELECT
            F.FEEDBACK_ID, F.RATING, F.COMMENTS, F.SUBMITTED_DATE,
            S.STUDENT_ID, S.FULL_NAME,
            E.EVENT_ID, E.EVENT_TITLE,
            R.REGISTRATION_ID
        FROM FEEDBACK F
        JOIN STUDENT S ON F.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON F.EVENT_ID = E.EVENT_ID
        JOIN REGISTRATION R ON F.REGISTRATION_ID = R.REGISTRATION_ID
        WHERE F.FEEDBACK_ID = %s
        """,
        (feedback_id,),
        fetch_one=True,
    )
    if not feedback:
        return jsonify({"success": False, "error": "Feedback not found"}), 404
    return jsonify({"success": True, "data": feedback}), 200


@feedback_bp.route("/api/feedback", methods=["POST"])
def create_feedback():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["feedback_id", "registration_id", "student_id", "event_id", "submitted_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    # Validate rating range
    rating = data.get("rating")
    if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
        return jsonify({"success": False, "error": "Rating must be an integer between 1 and 5"}), 400

    # Validate registration exists and belongs to this student+event
    registration = execute_query(
        """
        SELECT REGISTRATION_ID, STATUS FROM REGISTRATION
        WHERE REGISTRATION_ID = %s AND STUDENT_ID = %s AND EVENT_ID = %s
        """,
        (data["registration_id"], data["student_id"], data["event_id"]),
        fetch_one=True,
    )
    if not registration:
        return jsonify({
            "success": False,
            "error": "No matching registration found for this student and event",
        }), 404

    # Only allow feedback if the student attended
    if registration["STATUS"] not in ("CONFIRMED", "ATTENDED"):
        return jsonify({
            "success": False,
            "error": "Feedback can only be submitted for confirmed or attended registrations",
        }), 403

    # Check for duplicate feedback
    existing = execute_query(
        "SELECT FEEDBACK_ID FROM FEEDBACK WHERE STUDENT_ID = %s AND EVENT_ID = %s",
        (data["student_id"], data["event_id"]),
        fetch_one=True,
    )
    if existing:
        return jsonify({
            "success": False,
            "error": "Student has already submitted feedback for this event",
        }), 409

    try:
        execute_query(
            """
            INSERT INTO FEEDBACK (FEEDBACK_ID, REGISTRATION_ID, STUDENT_ID, EVENT_ID, RATING, COMMENTS, SUBMITTED_DATE)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["feedback_id"],
                data["registration_id"],
                data["student_id"],
                data["event_id"],
                data.get("rating"),
                data.get("comments"),
                data["submitted_date"],
            ),
            commit=True,
        )
        return jsonify({"success": True, "message": "Feedback submitted successfully"}), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            return jsonify({"success": False, "error": "Feedback ID already exists"}), 409
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Registration ID, Student ID, or Event ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400
