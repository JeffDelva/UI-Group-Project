from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import json
import random
import os
import datetime

app = Flask(__name__)
app.secret_key = os.urandom(24)

with open("static/data/lessons.json", "r") as f:
    lessons_data = json.load(f)

with open("static/data/quiz.json", "r") as f:
    all_quizzes = json.load(f)
    QUIZ = all_quizzes[0]


@app.route("/")
def home():
    if request.method == "GET" and request.referrer is None:
        reset_session()
    return render_template("home.html")


@app.route("/start")
def start():
    if "current_lesson" in session and session["current_lesson"] > 0:
        return redirect(url_for("lesson", lesson_num=session["current_lesson"]))
    return redirect(url_for("lesson", lesson_num=1))


@app.route("/lesson/<int:lesson_num>")
def lesson(lesson_num):
    if lesson_num < 1 or lesson_num > len(lessons_data):
        return redirect(url_for("home"))

    if request.method == "GET" and request.referrer is None:
        reset_session()

    session["last_lesson_access"] = {
        "lesson": lesson_num,
        "timestamp": str(datetime.datetime.now()),
    }

    session["current_lesson"] = lesson_num

    if "correct_answers" not in session:
        session["correct_answers"] = 0

    if "answered_questions" not in session:
        session["answered_questions"] = {}

    if "user_selections" not in session:
        session["user_selections"] = {}

    lesson_content = lessons_data[lesson_num - 1]
    progress = (lesson_num / len(lessons_data)) * 100

    feedback_data = {}
    answered_questions = session.get("answered_questions", {})
    user_selections = session.get("user_selections", {})

    for question_key, is_correct in answered_questions.items():
        if question_key.startswith(f"{lesson_num}_"):
            question_text = question_key[len(f"{lesson_num}_") :]

            user_selection = "Unknown"
            if question_key in user_selections:
                user_selection = "True" if user_selections[question_key] else "False"

            correct_answer_text = "Unknown"
            for question in lesson_content.get("questions", []):
                if question["question"] == question_text:
                    if isinstance(question["answer"], str):
                        correct_answer = question["answer"].lower() == "true"
                    else:
                        correct_answer = bool(question["answer"])
                    correct_answer_text = "True" if correct_answer else "False"
                    break

            feedback_data[question_text] = {
                "result": "Correct!" if is_correct else "Incorrect.",
                "correct_answer": correct_answer_text,
                "user_selection": user_selection,
            }

    return render_template(
        "lesson.html",
        lesson=lesson_content,
        lesson_num=lesson_num,
        total_lessons=len(lessons_data),
        progress=progress,
        correct_answers=session.get("correct_answers", 0),
        feedback_data=feedback_data,
    )


@app.route("/get_question/<int:lesson_num>")
def get_question(lesson_num):
    if lesson_num < 1 or lesson_num > len(lessons_data):
        return jsonify({"error": "Invalid lesson number"})

    lesson = lessons_data[lesson_num - 1]
    questions = lesson.get("questions", [])

    if not questions:
        return jsonify({"error": "No questions available for this lesson"})

    question = random.choice(questions)

    answered_questions = session.get("answered_questions", {})
    user_selections = session.get("user_selections", {})

    question_key = f"{lesson_num}_{question['question']}"
    already_answered = question_key in answered_questions

    feedback = None
    correct_answer_text = None
    user_selection = None

    if already_answered:
        is_correct = answered_questions[question_key]
        feedback = "Correct!" if is_correct else "Incorrect."

        if question_key in user_selections:
            user_selection = "true" if user_selections[question_key] else "false"

        if isinstance(question["answer"], str):
            correct_answer = question["answer"].lower() == "true"
        else:
            correct_answer = bool(question["answer"])
        correct_answer_text = "True" if correct_answer else "False"

    return jsonify(
        {
            "question": question["question"],
            "lesson_num": lesson_num,
            "already_answered": already_answered,
            "feedback": feedback,
            "correct_answer": correct_answer_text,
            "user_selection": user_selection,
        }
    )


@app.route("/check_answer/<int:lesson_num>", methods=["POST"])
def check_answer(lesson_num):
    if lesson_num < 1 or lesson_num > len(lessons_data):
        return jsonify({"error": "Invalid lesson number"})

    data = request.get_json()
    if not data or "question" not in data or "user_answer" not in data:
        return jsonify({"error": "Invalid request data"})

    question_text = data["question"]
    question_key = f"{lesson_num}_{question_text}"

    answered_questions = session.get("answered_questions", {})
    user_selections = session.get("user_selections", {})

    if isinstance(data["user_answer"], str):
        user_answer = data["user_answer"].lower() == "true"
    else:
        user_answer = bool(data["user_answer"])

    user_selections[question_key] = user_answer
    session["user_selections"] = user_selections
    session.modified = True

    if question_key in answered_questions:
        is_correct = answered_questions[question_key]

        lesson = lessons_data[lesson_num - 1]
        correct_answer_text = "Unknown"
        for question in lesson.get("questions", []):
            if question["question"] == question_text:
                if isinstance(question["answer"], str):
                    correct_answer = question["answer"].lower() == "true"
                else:
                    correct_answer = bool(question["answer"])
                correct_answer_text = "True" if correct_answer else "False"
                break

        return jsonify(
            {
                "already_answered": True,
                "correct": is_correct,
                "feedback": "Correct!" if is_correct else "Incorrect.",
                "correct_answer": correct_answer_text,
                "user_selection": "true" if user_answer else "false",
            }
        )

    lesson = lessons_data[lesson_num - 1]
    questions = lesson.get("questions", [])

    for question in questions:
        if question["question"] == question_text:
            if isinstance(question["answer"], str):
                correct_answer = question["answer"].lower() == "true"
            else:
                correct_answer = bool(question["answer"])

            print(
                f"Correct answer (raw): {question['answer']} (type: {type(question['answer'])})"
            )
            print(
                f"Correct answer (converted): {correct_answer} (type: {type(correct_answer)})"
            )

            correct = user_answer == correct_answer
            print(f"Comparison result: {correct}")

            if "answered_questions" not in session:
                session["answered_questions"] = {}
            session["answered_questions"][question_key] = correct

            if correct:
                if "correct_answers" not in session:
                    session["correct_answers"] = 0
                session["correct_answers"] += 1

            session.modified = True

            feedback = "Correct!" if correct else "Incorrect."
            correct_answer_text = "True" if correct_answer else "False"

            return jsonify(
                {
                    "correct": correct,
                    "feedback": feedback,
                    "correct_answer": correct_answer_text,
                    "already_answered": True,
                    "user_selection": "true" if user_answer else "false",
                }
            )

    return jsonify({"error": "Question not found"})


@app.route("/current_lesson")
def current_lesson():
    if "current_lesson" in session:
        return jsonify(
            {
                "current_lesson": session["current_lesson"],
                "correct_answers": session.get("correct_answers", 0),
            }
        )
    else:
        return jsonify({"current_lesson": 1, "correct_answers": 0})


@app.route("/quiz")
def quiz_page():
    session["quiz_access_timestamp"] = str(datetime.datetime.now())
    if "quiz_answers" not in session:
        session["quiz_answers"] = {}
    return render_template("quiz.html", QUIZ=QUIZ)


@app.route("/api/quiz_data")
def quiz_data():
    return jsonify(
        {
            "title": QUIZ["title"],
            "questions": QUIZ["questions"],
        }
    )


@app.route("/api/quiz_answer", methods=["POST"])
def quiz_answer():
    data = request.get_json()
    qid = data.get("question_id")
    selected = data.get("selected_id")

    question = next((q for q in QUIZ["questions"] if q["id"] == qid), None)
    if not question:
        return jsonify({"error": "invalid question_id"}), 400

    answers = session.setdefault("quiz_answers", {})
    answers[str(qid)] = selected
    session.modified = True

    correct_opts = [o for o in question["options"] if o.get("isCorrect", False)]
    is_correct = any(o["id"] == selected for o in correct_opts)
    correct_text = " / ".join(o["text"] for o in correct_opts)

    return jsonify(
        {
            "correct": is_correct,
            "feedback": "Correct!" if is_correct else "Incorrect!",
            "correct_answer": correct_text,
            "explanation": question.get("explanation", ""),
        }
    )


@app.route("/api/quiz_results")
def quiz_results():
    answers = session.get("quiz_answers", {})
    correct = 0
    total = len(QUIZ["questions"])

    for q in QUIZ["questions"]:
        sel = answers.get(str(q["id"]))
        if sel and any(
            o["id"] == sel and o.get("isCorrect", False) for o in q["options"]
        ):
            correct += 1

    pct = round(correct / total * 100)

    session["quiz_results"] = {
        "score": correct,
        "total": total,
        "percentage": pct,
        "timestamp": str(datetime.datetime.now()),
    }
    session.modified = True

    msg = next(
        (
            r["message"]
            for r in QUIZ["results"]["ranges"]
            if r["min"] <= pct <= r["max"]
        ),
        "No message found for your score.",
    )

    return jsonify({"score_pct": pct, "message": msg})


@app.route("/reset_progress", methods=["POST"])
def reset_progress():
    """Reset user progress and redirect to lesson 1."""
    try:
        session["correct_answers"] = 0
        if "answers" in session:
            session["answers"] = {}

        if "completed_lessons" in session:
            session["completed_lessons"] = []

        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Error resetting progress: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


def reset_session():
    """Helper function to reset the session data"""
    if "current_lesson" in session:
        session.pop("current_lesson")
    if "correct_answers" in session:
        session.pop("correct_answers")
    if "answered_questions" in session:
        session.pop("answered_questions")
    if "user_selections" in session:
        session.pop("user_selections")
    if "quiz_answers" in session:
        session.pop("quiz_answers")
    if "quiz_results" in session:
        session.pop("quiz_results")


if __name__ == "__main__":
    app.run(debug=True)
