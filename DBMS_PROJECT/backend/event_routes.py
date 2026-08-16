from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

event_bp = Blueprint("events", __name__)


@event_bp.route("/api/events", methods=["GET"])
def get_events():
    event_type = request.args.get("event_type")
    club_id = request.args.get("club_id")
    venue_id = request.args.get("venue_id")

    query = """
        SELECT
            E.EVENT_ID, E.EVENT_TITLE, E.EVENT_TYPE, E.DESCRIPTION,
            E.START_DATETIME, E.END_DATETIME, E.REGISTRATION_TYPE,
            E.MAX_CAPACITY, E.FEE,
            C.CLUB_ID, C.CLUB_NAME,
            V.VENUE_ID, V.VENUE_NAME, V.LOCATION AS VENUE_LOCATION
        FROM EVENT E
        LEFT JOIN CLUB C ON E.CLUB_ID = C.CLUB_ID
        LEFT JOIN VENUE V ON E.VENUE_ID = V.VENUE_ID
        WHERE 1=1
    """
    params = []

    if event_type:
        query += " AND E.EVENT_TYPE = %s"
        params.append(event_type)
    if club_id:
        query += " AND E.CLUB_ID = %s"
        params.append(club_id)
    if venue_id:
        query += " AND E.VENUE_ID = %s"
        params.append(venue_id)

    query += " ORDER BY E.START_DATETIME DESC"

    events = execute_query(query, params, fetch=True)
    return jsonify({"success": True, "data": events, "count": len(events)}), 200


@event_bp.route("/api/events/<int:event_id>", methods=["GET"])
def get_event(event_id):
    event = execute_query(
        """
        SELECT
            E.EVENT_ID, E.EVENT_TITLE, E.EVENT_TYPE, E.DESCRIPTION,
            E.START_DATETIME, E.END_DATETIME, E.REGISTRATION_TYPE,
            E.MAX_CAPACITY, E.FEE,
            C.CLUB_ID, C.CLUB_NAME,
            V.VENUE_ID, V.VENUE_NAME, V.LOCATION AS VENUE_LOCATION, V.CAPACITY AS VENUE_CAPACITY
        FROM EVENT E
        LEFT JOIN CLUB C ON E.CLUB_ID = C.CLUB_ID
        LEFT JOIN VENUE V ON E.VENUE_ID = V.VENUE_ID
        WHERE E.EVENT_ID = %s
        """,
        (event_id,),
        fetch_one=True,
    )
    if not event:
        return jsonify({"success": False, "error": "Event not found"}), 404
    return jsonify({"success": True, "data": event}), 200


@event_bp.route("/api/events", methods=["POST"])
def create_event():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = [
        "event_id", "event_title", "event_type", "start_datetime",
        "end_datetime", "registration_type",
    ]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    # Validate referenced club exists
    if data.get("club_id"):
        club = execute_query(
            "SELECT CLUB_ID FROM CLUB WHERE CLUB_ID = %s",
            (data["club_id"],),
            fetch_one=True,
        )
        if not club:
            return jsonify({"success": False, "error": "Club not found"}), 404

    # Validate referenced venue exists
    if data.get("venue_id"):
        venue = execute_query(
            "SELECT VENUE_ID FROM VENUE WHERE VENUE_ID = %s",
            (data["venue_id"],),
            fetch_one=True,
        )
        if not venue:
            return jsonify({"success": False, "error": "Venue not found"}), 404

    try:
        execute_query(
            """
            INSERT INTO EVENT (
                EVENT_ID, EVENT_TITLE, EVENT_TYPE, DESCRIPTION,
                START_DATETIME, END_DATETIME, REGISTRATION_TYPE,
                MAX_CAPACITY, FEE, CLUB_ID, VENUE_ID
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["event_id"],
                data["event_title"],
                data["event_type"],
                data.get("description"),
                data["start_datetime"],
                data["end_datetime"],
                data["registration_type"],
                data.get("max_capacity"),
                data.get("fee", 0.00),
                data.get("club_id"),
                data.get("venue_id"),
            ),
            commit=True,
        )
        return jsonify({"success": True, "message": "Event created successfully"}), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            return jsonify({"success": False, "error": "Event ID already exists"}), 409
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Club ID or Venue ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400


@event_bp.route("/api/events/<int:event_id>", methods=["PUT"])
def update_event(event_id):
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    existing = execute_query(
        "SELECT EVENT_ID FROM EVENT WHERE EVENT_ID = %s",
        (event_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Event not found"}), 404

    required = [
        "event_title", "event_type", "start_datetime", "end_datetime",
        "registration_type",
    ]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    # Validate referenced club exists
    if data.get("club_id"):
        club = execute_query(
            "SELECT CLUB_ID FROM CLUB WHERE CLUB_ID = %s",
            (data["club_id"],),
            fetch_one=True,
        )
        if not club:
            return jsonify({"success": False, "error": "Club not found"}), 404

    # Validate referenced venue exists
    if data.get("venue_id"):
        venue = execute_query(
            "SELECT VENUE_ID FROM VENUE WHERE VENUE_ID = %s",
            (data["venue_id"],),
            fetch_one=True,
        )
        if not venue:
            return jsonify({"success": False, "error": "Venue not found"}), 404

    try:
        execute_query(
            """
            UPDATE EVENT
            SET
                EVENT_TITLE = %s,
                EVENT_TYPE = %s,
                DESCRIPTION = %s,
                START_DATETIME = %s,
                END_DATETIME = %s,
                REGISTRATION_TYPE = %s,
                MAX_CAPACITY = %s,
                FEE = %s,
                CLUB_ID = %s,
                VENUE_ID = %s
            WHERE EVENT_ID = %s
            """,
            (
                data["event_title"],
                data["event_type"],
                data.get("description"),
                data["start_datetime"],
                data["end_datetime"],
                data["registration_type"],
                data.get("max_capacity"),
                data.get("fee", 0.00),
                data.get("club_id"),
                data.get("venue_id"),
                event_id,
            ),
            commit=True,
        )
        return jsonify({"success": True, "message": "Event updated successfully"}), 200

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Club ID or Venue ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400


@event_bp.route("/api/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    existing = execute_query(
        "SELECT EVENT_ID FROM EVENT WHERE EVENT_ID = %s",
        (event_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Event not found"}), 404

    try:
        execute_query(
            "DELETE FROM EVENT WHERE EVENT_ID = %s",
            (event_id,),
            commit=True,
        )
        return jsonify({"success": True, "message": "Event deleted successfully"}), 200
    except pymysql.err.IntegrityError:
        return jsonify({
            "success": False,
            "error": "Cannot delete event with linked registrations, teams, organizer roles, feedback, or sponsorships",
        }), 409
