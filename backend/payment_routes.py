from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

payment_bp = Blueprint("payments", __name__)


@payment_bp.route("/api/payments", methods=["GET"])
def get_payments():
    registration_id = request.args.get("registration_id")
    payment_status = request.args.get("payment_status")
    payment_mode = request.args.get("payment_mode")

    query = """
        SELECT
            P.PAYMENT_ID, P.AMOUNT, P.PAYMENT_MODE, P.PAYMENT_STATUS, P.PAYMENT_DATE,
            R.REGISTRATION_ID, R.STATUS AS REGISTRATION_STATUS,
            S.STUDENT_ID, S.FULL_NAME, S.ROLL_NO,
            E.EVENT_ID, E.EVENT_TITLE,
            T.TEAM_ID, T.TEAM_NAME
        FROM PAYMENT P
        JOIN REGISTRATION R ON P.REGISTRATION_ID = R.REGISTRATION_ID
        JOIN STUDENT S ON R.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON R.EVENT_ID = E.EVENT_ID
        LEFT JOIN TEAM T ON R.TEAM_ID = T.TEAM_ID
        WHERE 1=1
    """
    params = []

    if registration_id:
        query += " AND P.REGISTRATION_ID = %s"
        params.append(registration_id)
    if payment_status:
        query += " AND P.PAYMENT_STATUS = %s"
        params.append(payment_status)
    if payment_mode:
        query += " AND P.PAYMENT_MODE = %s"
        params.append(payment_mode)

    query += " ORDER BY P.PAYMENT_DATE DESC"

    payments = execute_query(query, params, fetch=True)
    return jsonify({"success": True, "data": payments, "count": len(payments)}), 200


@payment_bp.route("/api/payments/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    payment = execute_query(
        """
        SELECT
            P.PAYMENT_ID, P.AMOUNT, P.PAYMENT_MODE, P.PAYMENT_STATUS, P.PAYMENT_DATE,
            R.REGISTRATION_ID, R.STATUS AS REGISTRATION_STATUS,
            S.STUDENT_ID, S.FULL_NAME, S.ROLL_NO,
            E.EVENT_ID, E.EVENT_TITLE,
            T.TEAM_ID, T.TEAM_NAME
        FROM PAYMENT P
        JOIN REGISTRATION R ON P.REGISTRATION_ID = R.REGISTRATION_ID
        JOIN STUDENT S ON R.STUDENT_ID = S.STUDENT_ID
        JOIN EVENT E ON R.EVENT_ID = E.EVENT_ID
        LEFT JOIN TEAM T ON R.TEAM_ID = T.TEAM_ID
        WHERE P.PAYMENT_ID = %s
        """,
        (payment_id,),
        fetch_one=True,
    )
    if not payment:
        return jsonify({"success": False, "error": "Payment not found"}), 404
    return jsonify({"success": True, "data": payment}), 200


@payment_bp.route("/api/payments", methods=["POST"])
def create_payment():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["payment_id", "registration_id", "amount", "payment_mode", "payment_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    allowed_modes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"]
    if data["payment_mode"] not in allowed_modes:
        return jsonify({
            "success": False,
            "error": f"payment_mode must be one of {allowed_modes}",
        }), 400

    # Validate registration exists
    registration = execute_query(
        "SELECT REGISTRATION_ID FROM REGISTRATION WHERE REGISTRATION_ID = %s",
        (data["registration_id"],),
        fetch_one=True,
    )
    if not registration:
        return jsonify({"success": False, "error": "Registration not found"}), 404

    # Prevent duplicate payment for same registration (allow only if prior was FAILED)
    existing_payment = execute_query(
        "SELECT PAYMENT_ID, PAYMENT_STATUS FROM PAYMENT WHERE REGISTRATION_ID = %s",
        (data["registration_id"],),
        fetch_one=True,
    )
    if existing_payment and existing_payment["PAYMENT_STATUS"] not in ("FAILED",):
        return jsonify({
            "success": False,
            "error": "A payment already exists for this registration",
        }), 409

    try:
        execute_query(
            """
            INSERT INTO PAYMENT (PAYMENT_ID, REGISTRATION_ID, AMOUNT, PAYMENT_MODE, PAYMENT_STATUS, PAYMENT_DATE)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data["payment_id"],
                data["registration_id"],
                data["amount"],
                data["payment_mode"],
                data.get("payment_status", "PENDING"),
                data["payment_date"],
            ),
            commit=True,
        )
        return jsonify({"success": True, "message": "Payment recorded successfully"}), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            return jsonify({"success": False, "error": "Payment ID already exists"}), 409
        if code == 1452:
            return jsonify({"success": False, "error": "Invalid Registration ID"}), 400
        return jsonify({"success": False, "error": str(msg)}), 400


@payment_bp.route("/api/payments/<int:payment_id>", methods=["PUT"])
def update_payment(payment_id):
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["registration_id", "amount", "payment_mode", "payment_status", "payment_date"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    allowed_modes = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"]
    if data["payment_mode"] not in allowed_modes:
        return jsonify({
            "success": False,
            "error": f"payment_mode must be one of {allowed_modes}",
        }), 400

    allowed_statuses = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"]
    if data["payment_status"] not in allowed_statuses:
        return jsonify({
            "success": False,
            "error": f"payment_status must be one of {allowed_statuses}",
        }), 400

    existing = execute_query(
        "SELECT PAYMENT_ID, REGISTRATION_ID FROM PAYMENT WHERE PAYMENT_ID = %s",
        (payment_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Payment not found"}), 404

    registration = execute_query(
        "SELECT REGISTRATION_ID FROM REGISTRATION WHERE REGISTRATION_ID = %s",
        (data["registration_id"],),
        fetch_one=True,
    )
    if not registration:
        return jsonify({"success": False, "error": "Registration not found"}), 404

    duplicate_check = execute_query(
        """
        SELECT PAYMENT_ID, PAYMENT_STATUS
        FROM PAYMENT
        WHERE REGISTRATION_ID = %s AND PAYMENT_ID != %s
        """,
        (data["registration_id"], payment_id),
        fetch_one=True,
    )
    if duplicate_check and duplicate_check["PAYMENT_STATUS"] not in ("FAILED",):
        return jsonify({
            "success": False,
            "error": "Another active payment already exists for this registration",
        }), 409

    execute_query(
        """
        UPDATE PAYMENT
        SET
            REGISTRATION_ID = %s,
            AMOUNT = %s,
            PAYMENT_MODE = %s,
            PAYMENT_STATUS = %s,
            PAYMENT_DATE = %s
        WHERE PAYMENT_ID = %s
        """,
        (
            data["registration_id"],
            data["amount"],
            data["payment_mode"],
            data["payment_status"],
            data["payment_date"],
            payment_id,
        ),
        commit=True,
    )
    return jsonify({"success": True, "message": "Payment updated successfully"}), 200


@payment_bp.route("/api/payments/<int:payment_id>/status", methods=["PATCH"])
def update_payment_status(payment_id):
    data = request.get_json()
    if not data or "payment_status" not in data:
        return jsonify({"success": False, "error": "'payment_status' field is required"}), 400

    allowed_statuses = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"]
    if data["payment_status"] not in allowed_statuses:
        return jsonify({
            "success": False,
            "error": f"payment_status must be one of {allowed_statuses}",
        }), 400

    existing = execute_query(
        "SELECT PAYMENT_ID FROM PAYMENT WHERE PAYMENT_ID = %s",
        (payment_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Payment not found"}), 404

    execute_query(
        "UPDATE PAYMENT SET PAYMENT_STATUS = %s WHERE PAYMENT_ID = %s",
        (data["payment_status"], payment_id),
        commit=True,
    )
    return jsonify({"success": True, "message": "Payment status updated"}), 200


@payment_bp.route("/api/payments/<int:payment_id>", methods=["DELETE"])
def delete_payment(payment_id):
    existing = execute_query(
        "SELECT PAYMENT_ID FROM PAYMENT WHERE PAYMENT_ID = %s",
        (payment_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Payment not found"}), 404

    execute_query(
        "DELETE FROM PAYMENT WHERE PAYMENT_ID = %s",
        (payment_id,),
        commit=True,
    )
    return jsonify({"success": True, "message": "Payment deleted successfully"}), 200
