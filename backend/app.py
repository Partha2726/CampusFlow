from flask import Flask, jsonify
from config import Config
from student_routes import student_bp
from event_routes import event_bp
from team_routes import team_bp
from registration_routes import registration_bp
from payment_routes import payment_bp
from feedback_routes import feedback_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    app.register_blueprint(student_bp)
    app.register_blueprint(event_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(registration_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(feedback_bp)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "CECMS API"}), 200

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    # 400 handler
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": "Bad request"}), 400

    # 404 handler
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    # 405 handler
    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "error": "Method not allowed"}), 405

    # 500 handler
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=Config.DEBUG,
    )
