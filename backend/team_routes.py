from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

team_bp = Blueprint("teams", __name__)


@team_bp.route("/api/teams", methods=["GET"])
def get_teams():
    event_id = request.args.get("event_id")

    query = """
        SELECT
            T.TEAM_ID, T.TEAM_NAME, T.EVENT_ID, T.LEADER_STUDENT_ID, T.CREATED_DATE,
            E.EVENT_TITLE,
            S.FULL_NAME AS LEADER_NAME
        FROM TEAM T
        JOIN EVENT E ON T.EVENT_ID = E.EVENT_ID
        JOIN STUDENT S ON T.LEADER_STUDENT_ID = S.STUDENT_ID
        WHERE 1=1
    """
    params = []

    if event_id:
        query += " AND T.EVENT_ID = %s"
        params.append(event_id)

    query += " ORDER BY T.CREATED_DATE DESC, T.TEAM_NAME"

    teams = execute_query(query, params, fetch=True)
    return jsonify({"success": True, "data": teams, "count": len(teams)}), 200


@team_bp.route("/api/teams/<int:team_id>/members", methods=["GET"])
def get_team_members(team_id):
    team = execute_query(
        """
        SELECT
            T.TEAM_ID, T.TEAM_NAME, T.EVENT_ID, T.LEADER_STUDENT_ID,
            E.EVENT_TITLE,
            L.FULL_NAME AS LEADER_NAME
        FROM TEAM T
        JOIN EVENT E ON T.EVENT_ID = E.EVENT_ID
        JOIN STUDENT L ON T.LEADER_STUDENT_ID = L.STUDENT_ID
        WHERE T.TEAM_ID = %s
        """,
        (team_id,),
        fetch_one=True,
    )
    if not team:
        return jsonify({"success": False, "error": "Team not found"}), 404

    members = execute_query(
        """
        SELECT
            TM.TEAM_MEMBER_ID, TM.STUDENT_ID, TM.ROLE_IN_TEAM, TM.JOINED_DATE,
            S.FULL_NAME, S.ROLL_NO
        FROM TEAM_MEMBER TM
        JOIN STUDENT S ON TM.STUDENT_ID = S.STUDENT_ID
        WHERE TM.TEAM_ID = %s
        ORDER BY CASE WHEN TM.STUDENT_ID = %s THEN 0 ELSE 1 END, TM.TEAM_MEMBER_ID
        """,
        (team_id, team["LEADER_STUDENT_ID"]),
        fetch=True,
    )

    return jsonify({
        "success": True,
        "data": {
            "team": team,
            "members": members,
            "count": len(members),
        },
    }), 200


@team_bp.route("/api/teams", methods=["POST"])
def create_team():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["team_id", "team_name", "event_id", "leader_student_id", "created_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    event = execute_query(
        "SELECT EVENT_ID FROM EVENT WHERE EVENT_ID = %s",
        (data["event_id"],),
        fetch_one=True,
    )
    if not event:
        return jsonify({"success": False, "error": "Event not found"}), 404

    student = execute_query(
        "SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID = %s",
        (data["leader_student_id"],),
        fetch_one=True,
    )
    if not student:
        return jsonify({"success": False, "error": "Leader student not found"}), 404

    member_ids = data.get("member_student_ids", [])
    if member_ids is None:
        member_ids = []
    if not isinstance(member_ids, list):
        return jsonify({"success": False, "error": "'member_student_ids' must be a list"}), 400

    try:
        member_ids = [int(m) for m in member_ids]
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "All member IDs must be numeric"}), 400

    leader_id = int(data["leader_student_id"])
    if leader_id not in member_ids:
        return jsonify({
            "success": False,
            "error": "Leader must be selected from checked team members",
        }), 400

    unique_member_ids = list(dict.fromkeys(member_ids + [leader_id]))

    if unique_member_ids:
        placeholders = ", ".join(["%s"] * len(unique_member_ids))
        rows = execute_query(
            f"SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID IN ({placeholders})",
            tuple(unique_member_ids),
            fetch=True,
        )
        found_ids = {r["STUDENT_ID"] for r in rows}
        missing_ids = [sid for sid in unique_member_ids if sid not in found_ids]
        if missing_ids:
            return jsonify({
                "success": False,
                "error": f"Invalid member student IDs: {missing_ids}",
            }), 400

    try:
        execute_query(
            """
            INSERT INTO TEAM (TEAM_ID, TEAM_NAME, EVENT_ID, LEADER_STUDENT_ID, CREATED_DATE)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data["team_id"],
                data["team_name"],
                data["event_id"],
                data["leader_student_id"],
                data["created_date"],
            ),
            commit=True,
        )

        if unique_member_ids:
            max_row = execute_query(
                "SELECT COALESCE(MAX(TEAM_MEMBER_ID), 0) AS max_id FROM TEAM_MEMBER",
                fetch_one=True,
            )
            next_id = int(max_row["max_id"]) + 1
            for i, sid in enumerate(unique_member_ids):
                role = "leader" if sid == leader_id else "member"
                execute_query(
                    """
                    INSERT INTO TEAM_MEMBER (TEAM_MEMBER_ID, TEAM_ID, STUDENT_ID, ROLE_IN_TEAM, JOINED_DATE)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        next_id + i,
                        data["team_id"],
                        sid,
                        role,
                        data["created_date"],
                    ),
                    commit=True,
                )

        return jsonify({
            "success": True,
            "message": "Team created successfully",
            "members_added": len(unique_member_ids),
        }), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            return jsonify({"success": False, "error": "Team ID already exists"}), 409
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Event ID or Leader Student ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400


@team_bp.route("/api/teams/<int:team_id>", methods=["PUT"])
def update_team(team_id):
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["team_name", "event_id", "leader_student_id", "created_date", "member_student_ids"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    existing_team = execute_query(
        "SELECT TEAM_ID, EVENT_ID FROM TEAM WHERE TEAM_ID = %s",
        (team_id,),
        fetch_one=True,
    )
    if not existing_team:
        return jsonify({"success": False, "error": "Team not found"}), 404

    event = execute_query(
        "SELECT EVENT_ID FROM EVENT WHERE EVENT_ID = %s",
        (data["event_id"],),
        fetch_one=True,
    )
    if not event:
        return jsonify({"success": False, "error": "Event not found"}), 404

    student = execute_query(
        "SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID = %s",
        (data["leader_student_id"],),
        fetch_one=True,
    )
    if not student:
        return jsonify({"success": False, "error": "Leader student not found"}), 404

    member_ids = data.get("member_student_ids", [])
    if member_ids is None or not isinstance(member_ids, list):
        return jsonify({"success": False, "error": "'member_student_ids' must be a list"}), 400

    try:
        member_ids = [int(m) for m in member_ids]
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "All member IDs must be numeric"}), 400

    leader_id = int(data["leader_student_id"])
    if leader_id not in member_ids:
        return jsonify({
            "success": False,
            "error": "Leader must be selected from checked team members",
        }), 400

    unique_member_ids = list(dict.fromkeys(member_ids))
    if not unique_member_ids:
        return jsonify({"success": False, "error": "Team must have at least one member"}), 400

    placeholders = ", ".join(["%s"] * len(unique_member_ids))
    rows = execute_query(
        f"SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID IN ({placeholders})",
        tuple(unique_member_ids),
        fetch=True,
    )
    found_ids = {r["STUDENT_ID"] for r in rows}
    missing_ids = [sid for sid in unique_member_ids if sid not in found_ids]
    if missing_ids:
        return jsonify({
            "success": False,
            "error": f"Invalid member student IDs: {missing_ids}",
        }), 400

    # Protect consistency if registrations already exist for this team.
    reg_exists = execute_query(
        "SELECT REGISTRATION_ID FROM REGISTRATION WHERE TEAM_ID = %s LIMIT 1",
        (team_id,),
        fetch_one=True,
    )
    if reg_exists and int(existing_team["EVENT_ID"]) != int(data["event_id"]):
        return jsonify({
            "success": False,
            "error": "Cannot change team event after registrations exist for this team",
        }), 409

    execute_query(
        """
        UPDATE TEAM
        SET TEAM_NAME = %s, EVENT_ID = %s, LEADER_STUDENT_ID = %s, CREATED_DATE = %s
        WHERE TEAM_ID = %s
        """,
        (
            data["team_name"],
            data["event_id"],
            data["leader_student_id"],
            data["created_date"],
            team_id,
        ),
        commit=True,
    )

    current_member_rows = execute_query(
        "SELECT TEAM_MEMBER_ID, STUDENT_ID FROM TEAM_MEMBER WHERE TEAM_ID = %s",
        (team_id,),
        fetch=True,
    )
    current_ids = {r["STUDENT_ID"] for r in current_member_rows}
    new_ids = set(unique_member_ids)

    to_remove = current_ids - new_ids
    to_add = new_ids - current_ids

    for sid in to_remove:
        execute_query(
            "DELETE FROM TEAM_MEMBER WHERE TEAM_ID = %s AND STUDENT_ID = %s",
            (team_id, sid),
            commit=True,
        )

    if to_add:
        max_row = execute_query(
            "SELECT COALESCE(MAX(TEAM_MEMBER_ID), 0) AS max_id FROM TEAM_MEMBER",
            fetch_one=True,
        )
        next_id = int(max_row["max_id"]) + 1
        for i, sid in enumerate(sorted(to_add)):
            role = "leader" if sid == leader_id else "member"
            execute_query(
                """
                INSERT INTO TEAM_MEMBER (TEAM_MEMBER_ID, TEAM_ID, STUDENT_ID, ROLE_IN_TEAM, JOINED_DATE)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    next_id + i,
                    team_id,
                    sid,
                    role,
                    data["created_date"],
                ),
                commit=True,
            )

    # Refresh role flags for all current members
    for sid in unique_member_ids:
        role = "leader" if sid == leader_id else "member"
        execute_query(
            "UPDATE TEAM_MEMBER SET ROLE_IN_TEAM = %s WHERE TEAM_ID = %s AND STUDENT_ID = %s",
            (role, team_id, sid),
            commit=True,
        )

    return jsonify({
        "success": True,
        "message": "Team updated successfully",
        "member_count": len(unique_member_ids),
    }), 200
