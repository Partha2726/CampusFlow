from flask import Blueprint, request, jsonify
import pymysql
from db import execute_query

student_bp = Blueprint("students", __name__)


@student_bp.route("/api/students", methods=["GET"])
def get_students():
    dept = request.args.get("department")
    year = request.args.get("academic_year")

    query = "SELECT * FROM STUDENT WHERE 1=1"
    params = []

    if dept:
        query += " AND DEPARTMENT = %s"
        params.append(dept)
    if year:
        query += " AND ACADEMIC_YEAR = %s"
        params.append(year)

    query += " ORDER BY FULL_NAME"

    students = execute_query(query, params, fetch=True)
    return jsonify({"success": True, "data": students, "count": len(students)}), 200


@student_bp.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    student = execute_query(
        "SELECT * FROM STUDENT WHERE STUDENT_ID = %s",
        (student_id,),
        fetch_one=True,
    )
    if not student:
        return jsonify({"success": False, "error": "Student not found"}), 404
    return jsonify({"success": True, "data": student}), 200


@student_bp.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    required = ["student_id", "roll_no", "full_name", "email", "department", "academic_year"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    try:
        execute_query(
            """
            INSERT INTO STUDENT (STUDENT_ID, ROLL_NO, FULL_NAME, EMAIL, DEPARTMENT, ACADEMIC_YEAR, PHONE)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data["student_id"],
                data["roll_no"],
                data["full_name"],
                data["email"],
                data["department"],
                data["academic_year"],
                data.get("phone"),
            ),
            commit=True,
        )
        return jsonify({"success": True, "message": "Student created successfully"}), 201

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            if "ROLL_NO" in str(msg):
                error = "Roll number already exists"
            elif "EMAIL" in str(msg):
                error = "Email already exists"
            else:
                error = "Duplicate entry"
            return jsonify({"success": False, "error": error}), 409
        return jsonify({"success": False, "error": str(msg)}), 400


@student_bp.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Request body is required"}), 400

    existing = execute_query(
        "SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID = %s",
        (student_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Student not found"}), 404

    fields = []
    values = []
    allowed = ["roll_no", "full_name", "email", "department", "academic_year", "phone"]
    for field in allowed:
        if field in data:
            fields.append(f"{field.upper()} = %s")
            values.append(data[field])

    if not fields:
        return jsonify({"success": False, "error": "No valid fields to update"}), 400

    values.append(student_id)
    try:
        execute_query(
            f"UPDATE STUDENT SET {', '.join(fields)} WHERE STUDENT_ID = %s",
            values,
            commit=True,
        )
        return jsonify({"success": True, "message": "Student updated successfully"}), 200

    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            if "ROLL_NO" in str(msg):
                error = "Roll number already exists"
            elif "EMAIL" in str(msg):
                error = "Email already exists"
            else:
                error = "Duplicate entry"
            return jsonify({"success": False, "error": error}), 409
        return jsonify({"success": False, "error": str(msg)}), 400


@student_bp.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    existing = execute_query(
        "SELECT STUDENT_ID FROM STUDENT WHERE STUDENT_ID = %s",
        (student_id,),
        fetch_one=True,
    )
    if not existing:
        return jsonify({"success": False, "error": "Student not found"}), 404

    try:
        execute_query(
            "DELETE FROM STUDENT WHERE STUDENT_ID = %s",
            (student_id,),
            commit=True,
        )
        return jsonify({"success": True, "message": "Student deleted successfully"}), 200

    except pymysql.err.IntegrityError as e:
        return jsonify({
            "success": False,
            "error": "Cannot delete student with existing registrations, memberships, or roles",
        }), 409
