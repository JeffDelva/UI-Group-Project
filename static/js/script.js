$(document).ready(function () {
  $("#checkLearningBtn").click(function () {
    $("#questionContainer").hide();
    $("#resultContainer").hide();
    $("#correctAnswer").hide();

    const lessonNum = $(this).data("lesson-num");
    console.log("Loading question for lesson:", lessonNum);

    $.ajax({
      url: `/get_question/${lessonNum}`,
      method: "GET",
      success: function (data) {
        if (data.error) {
          alert(data.error);
          return;
        }

        console.log("Received question:", data);

        $("#questionText").text(data.question);
        $("#questionContainer").show();

        $("#questionContainer").data("current-question", data.question);
      },
      error: function (xhr, status, error) {
        console.error("Error loading question:", error);
        alert("Failed to load question. Please try again.");
      },
    });
  });

  $(".answer-btn").click(function () {
    const userAnswer = $(this).data("value");
    const lessonNum = $("#checkLearningBtn").data("lesson-num");
    const questionText = $("#questionContainer").data("current-question");

    console.log(
      `User selected: ${userAnswer} (${typeof userAnswer}) for lesson ${lessonNum}`
    );

    $.ajax({
      url: `/check_answer/${lessonNum}`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        question: questionText,
        user_answer: userAnswer,
      }),
      success: function (data) {
        if (data.error) {
          console.error("Error from server:", data.error);
          alert(data.error);
          return;
        }

        console.log("Response from server:", data);

        $("#resultText").text(data.feedback);
        $("#resultContainer").removeClass("correct incorrect");

        if (data.correct) {
          $("#resultContainer").addClass("correct");
          $("#correctAnswer").hide();
        } else {
          $("#resultContainer").addClass("incorrect");
          $("#correctAnswer").text(
            `The correct answer is: ${data.correct_answer}`
          );
          $("#correctAnswer").show();
        }

        $("#resultContainer").show();
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", error);
        console.error("Status:", status);
        console.error("Response:", xhr.responseText);
        alert("Failed to check answer. Please try again.");
      },
    });
  });
});
