from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import random

app = Flask(__name__)

with open("static/data/lessons.json", "r") as f:
    lessons_data = json.load(f)


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/start")
def start():
    return redirect(url_for("lesson", lesson_num=1))


@app.route("/lesson/<int:lesson_num>")
def lesson(lesson_num):
    if lesson_num < 1 or lesson_num > len(lessons_data):
        return redirect(url_for("home"))

    lesson_content = lessons_data[lesson_num - 1]
    progress = (lesson_num / len(lessons_data)) * 100

    return render_template(
        "lesson.html",
        lesson=lesson_content,
        lesson_num=lesson_num,
        total_lessons=len(lessons_data),
        progress=progress,
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

    return jsonify({"question": question["question"], "lesson_num": lesson_num})


@app.route("/check_answer/<int:lesson_num>", methods=["POST"])
def check_answer(lesson_num):
    if lesson_num < 1 or lesson_num > len(lessons_data):
        return jsonify({"error": "Invalid lesson number"})

    data = request.get_json()
    if not data or "question" not in data or "user_answer" not in data:
        return jsonify({"error": "Invalid request data"})

    question_text = data["question"]

    if isinstance(data["user_answer"], str):
        user_answer = data["user_answer"].lower() == "true"
    else:
        user_answer = bool(data["user_answer"])

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

            feedback = "Correct!" if correct else "Incorrect. Try again!"
            correct_answer_text = "True" if correct_answer else "False"

            return jsonify(
                {
                    "correct": correct,
                    "feedback": feedback,
                    "correct_answer": correct_answer_text,
                }
            )

    return jsonify({"error": "Question not found"})


if __name__ == "__main__":
    app.run(debug=True)
