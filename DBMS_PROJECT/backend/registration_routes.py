from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

registration_bp = Blueprint("registrations", __name__)


def _is_paid_event(event_row):
    fee = event_row.get("FEE")
    return fee is not None and float(fee) > 0


def _create_pending_payment(registration_id, amount, payment_date):
    max_row = execute_query(
        "SELECT COALESCE(MAX(PAYMENT_ID), 0) AS max_id FROM PAYMENT",
        fetch_one=True,
    )
    payment_id = int(max_row["max_id"]) + 1
    execute_query(
        """
        INSERT INTO PAYMENT (PAYMENT_ID, REGISTRATION_ID, AMOUNT, PAYMENT_MODE, PAYMENT_STATUS, PAYMENT_DATE)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            payment_id,
            registration_id,
            amount,
            "ONLINE",
            "PENDING",
            payment_date,
        ),
        commit=True,
    )
    return payment_id


@registration_bp.route("/api/registrations", methods=["GET"])
def get_registrations():
    student_id = request.args.get("student_id")
    event_id = request.args.get("event_id")
    status = request.args.get("status")

    query = """
        SELECT
            R.REGISTRATION_ID, R.REGISTRATION_DATE, R.STATUS,
            S.STUDENT_ID, S.FULL_NAME, S.ROLL_NO, S.EMAIL,
            E.EVENT_ID, E.EVENT_TITLE, E.EVENT_TYPE, E.START_DATETIME, E.FEE,
            T.TEAM_ID, T.TEAM_NAME,
            P.PAYMENT_ID, P.PAYMENT_STATUS
        FROM REGISTRATION R
        JOIN STUDENT S ON R.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON R.EVENT_ID = E.EVENT_ID
        LEFT JOIN TEAM T ON R.TEAM_ID = T.TEAM_ID
        LEFT JOIN PAYMENT P ON P.REGISTRATION_ID = R.REGISTRATION_ID
        WHERE 1=1
    """
    params = []

    if student_id:
        query += " AND R.STUDENT_ID = %s"
        params.append(student_id)
    if event_id:
        query += " AND R.EVENT_ID = %s"
        params.append(event_id)
    if status:
        query += " AND R.STATUS = %s"
        params.append(status)

    query += " ORDER BY R.REGISTRATION_DATE DESC"

    registrations = execute_query(query, params, fetch=True)
    return jsonify({"success": True, "data": registrations, "count": len(registrations)}), 200


@registration_bp.route("/api/registrations/<int:registration_id>", methods=["GET"])
def get_registration(registration_id):
    reg = execute_query(
        """
        SELECT
            R.REGISTRATION_ID, R.REGISTRATION_DATE, R.STATUS,
            S.STUDENT_ID, S.FULL_NAME, S.ROLL_NO,
            E.EVENT_ID, E.EVENT_TITLE, E.FEE,
            T.TEAM_ID, T.TEAM_NAME,
            P.PAYMENT_ID, P.PAYMENT_STATUS
        FROM REGISTRATION R
        JOIN STUDENT S ON R.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON R.EVENT_ID = E.EVENT_ID
        LEFT JOIN TEAM T ON R.TEAM_ID = T.TEAM_ID
        LEFT JOIN PAYMENT P ON P.REGISTRATION_ID = R.REGISTRATION_ID
        WHERE R.REGISTRATION_ID = %s
        """,
        (registration_id,),
        fetch_one=True,
    )
    if not reg:
        return jsonify({"success": False, "error": "Registration not found"}), 404
    return jsonify({"success": True, "data": reg}), 200


@registration_bp.route("/api/registrations", methods=["POST"])
def create_registration():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["registration_id", "student_id", "event_id", "registration_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    # Validate student exists
    student = execute_query(
        "SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID = %s",
        (data["student_id"],),
        fetch_one=True,
    )
    if not student:
        return jsonify({"success": False, "error": "Student not found"}), 404

    # Validate event exists
    event = execute_query(
        "SELECT EVENT_ID, MAX_CAPACITY, FEE FROM EVENT WHERE EVENT_ID = %s",
        (data["event_id"],),
        fetch_one=True,
    )
    if not event:
        return jsonify({"success": False, "error": "Event not found"}), 404

    # Check max capacity
    if event["MAX_CAPACITY"]:
        current_count = execute_query(
            "SELECT COUNT(*) AS cnt FROM REGISTRATION WHERE EVENT_ID = %s AND STATUS != 'CANCELLED'",
            (data["event_id"],),
            fetch_one=True,
        )
        if current_count["cnt"] >= event["MAX_CAPACITY"]:
            return jsonify({"success": False, "error": "Event has reached maximum capacity"}), 409

    # Validate team exists if provided
    if data.get("team_id"):
        team = execute_query(
            "SELECT TEAM_ID FROM TEAM WHERE TEAM_ID = %s AND EVENT_ID = %s",
            (data["team_id"], data["event_id"]),
            fetch_one=True,
        )
        if not team:
            return jsonify({"success": False, "error": "Team not found or does not belong to this event"}), 404

    registration_status = "PENDING" if _is_paid_event(event) else "REGISTERED"

    try:
        execute_query(
            """
            INSERT INTO REGISTRATION (REGISTRATION_ID, STUDENT_ID, TEAM_ID, EVENT_ID, REGISTRATION_DATE, STATUS)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data["registration_id"],
                data["student_id"],
                data.get("team_id"),
                data["event_id"],
                data["registration_date"],
                registration_status,
            ),
            commit=True,
        )

        payment_id = None
        if _is_paid_event(event):
            payment_id = _create_pending_payment(
                data["registration_id"],
                float(event["FEE"]),
                data["registration_date"],
            )

        return jsonify({
            "success": True,
            "message": "Registration created successfully",
            "status": registration_status,
            "payment_created": payment_id is not None,
            "payment_id": payment_id,
        }), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            if "STUDENT_ID" in str(msg) and "EVENT_ID" in str(msg):
                error = "Student is already registered for this event"
            else:
                error = "Registration ID already exists"
            return jsonify({"success": False, "error": error}), 409
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Student ID, Event ID, or Team ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400


@registration_bp.route("/api/registrations/team", methods=["POST"])
def create_team_registrations():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["team_id", "registration_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    team = execute_query(
        "SELECT TEAM_ID, EVENT_ID, LEADER_STUDENT_ID FROM TEAM WHERE TEAM_ID = %s",
        (data["team_id"],),
        fetch_one=True,
    )
    if not team:
        return jsonify({"success": False, "error": "Team not found"}), 404

    member_rows = execute_query(
        "SELECT STUDENT_ID FROM TEAM_MEMBER WHERE TEAM_ID = %s",
        (data["team_id"],),
        fetch=True,
    )
    member_ids = [r["STUDENT_ID"] for r in member_rows]
    if not member_ids:
        member_ids = [team["LEADER_STUDENT_ID"]]

    # Avoid duplicate student rows in edge cases
    member_ids = list(dict.fromkeys(member_ids))

    event = execute_query(
        "SELECT EVENT_ID, MAX_CAPACITY, FEE FROM EVENT WHERE EVENT_ID = %s",
        (team["EVENT_ID"],),
        fetch_one=True,
    )
    if not event:
        return jsonify({"success": False, "error": "Event not found for team"}), 404

    placeholders = ", ".join(["%s"] * len(member_ids))
    already_registered = execute_query(
        f"""
        SELECT STUDENT_ID
        FROM REGISTRATION
        WHERE EVENT_ID = %s AND STUDENT_ID IN ({placeholders})
        """,
        tuple([team["EVENT_ID"]] + member_ids),
        fetch=True,
    )
    duplicate_ids = [r["STUDENT_ID"] for r in already_registered]
    if duplicate_ids:
        return jsonify({
            "success": False,
            "error": f"These students are already registered for this event: {duplicate_ids}",
        }), 409

    if event["MAX_CAPACITY"]:
        current_count = execute_query(
            "SELECT COUNT(*) AS cnt FROM REGISTRATION WHERE EVENT_ID = %s AND STATUS != 'CANCELLED'",
            (team["EVENT_ID"],),
            fetch_one=True,
        )
        if current_count["cnt"] + len(member_ids) > event["MAX_CAPACITY"]:
            return jsonify({"success": False, "error": "Event does not have enough capacity for entire team"}), 409

    max_row = execute_query(
        "SELECT COALESCE(MAX(REGISTRATION_ID), 0) AS max_id FROM REGISTRATION",
        fetch_one=True,
    )
    next_reg_id = int(max_row["max_id"]) + 1

    registration_status = "PENDING" if _is_paid_event(event) else "REGISTERED"
    created = []
    try:
        for i, student_id in enumerate(member_ids):
            reg_id = next_reg_id + i
            execute_query(
                """
                INSERT INTO REGISTRATION (REGISTRATION_ID, STUDENT_ID, TEAM_ID, EVENT_ID, REGISTRATION_DATE, STATUS)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    reg_id,
                    student_id,
                    team["TEAM_ID"],
                    team["EVENT_ID"],
                    data["registration_date"],
                    registration_status,
                ),
                commit=True,
            )
            payment_id = None
            if _is_paid_event(event):
                payment_id = _create_pending_payment(
                    reg_id,
                    float(event["FEE"]),
                    data["registration_date"],
                )
            created.append({
                "registration_id": reg_id,
                "student_id": student_id,
                "payment_id": payment_id,
            })

        return jsonify({
            "success": True,
            "message": "Team registered successfully",
            "team_id": team["TEAM_ID"],
            "event_id": team["EVENT_ID"],
            "status": registration_status,
            "registered_count": len(created),
            "registrations": created,
        }), 201
    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            return jsonify({
                "success": False,
                "error": "Duplicate registration detected while processing team registration",
            }), 409
        return jsonify({"success": False, "error": str(msg)}), 400


@registration_bp.route("/api/registrations/<int:registration_id>", methods=["PATCH"])
def update_registration_status(registration_id):
    data = request.get_json()
    if not data or "status" not in data:
        return jsonify({"success": False, "error": "'status' field is required"}), 400

    allowed_statuses = ["PENDING", "REGISTERED", "CONFIRMED", "CANCELLED", "ATTENDED"]
    if data["status"] not in allowed_statuses:
        return jsonify({
            "success": False,
            "error": f"Status must be one of {allowed_statuses}",
        }), 400

    existing = execute_query(
        """
        SELECT
            R.REGISTRATION_ID,
            E.FEE,
            P.PAYMENT_STATUS
        FROM REGISTRATION R
        JOIN EVENT E ON E.EVENT_ID = R.EVENT_ID
        LEFT JOIN PAYMENT P ON P.REGISTRATION_ID = R.REGISTRATION_ID
        WHERE R.REGISTRATION_ID = %s
        """,
        (registration_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Registration not found"}), 404

    if _is_paid_event(existing):
        payment_status = existing.get("PAYMENT_STATUS")
        payment_status_norm = str(payment_status).upper() if payment_status is not None else None
        if payment_status_norm is None or payment_status_norm == "PENDING":
            if data["status"] not in ("PENDING", "REGISTERED"):
                return jsonify({
                    "success": False,
                    "error": "For paid events, update payment status first before changing registration to CONFIRMED/CANCELLED/ATTENDED",
                }), 409

    execute_query(
        "UPDATE REGISTRATION SET STATUS = %s WHERE REGISTRATION_ID = %s",
        (data["status"], registration_id),
        commit=True,
    )
    return jsonify({"success": True, "message": "Registration status updated"}), 200


@registration_bp.route("/api/registrations/<int:registration_id>", methods=["DELETE"])
def delete_registration(registration_id):
    existing = execute_query(
        "SELECT REGISTRATION_ID FROM REGISTRATION WHERE REGISTRATION_ID = %s",
        (registration_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Registration not found"}), 404

    try:
        execute_query(
            "DELETE FROM REGISTRATION WHERE REGISTRATION_ID = %s",
            (registration_id,),
            commit=True,
        )
        return jsonify({"success": True, "message": "Registration deleted successfully"}), 200
    except pymysql.err.IntegrityError:
        return jsonify({
            "success": False,
            "error": "Cannot delete registration with linked payment or feedback records",
        }), 409
