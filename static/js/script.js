$(document).ready(function () {
  $("#startOverBtn").click(function () {
    if (
      confirm(
        "Are you sure you want to reset your progress? This will clear all your answers and take you back to lesson 1."
      )
    ) {
      $.ajax({
        url: "/reset_progress",
        method: "POST",
        success: function (data) {
          if (data.success) {
            window.location.href = "/lesson/1";
          } else {
            alert("Failed to reset progress. Please try again.");
          }
        },
        error: function (xhr, status, error) {
          console.error("Error resetting progress:", error);
          alert("Failed to reset progress. Please try again.");
        },
      });
    }
  });

  $("#checkLearningBtn").click(function () {
    $("#questionContainer").hide();
    $("#resultContainer").hide();
    $("#correctAnswer").hide();

    const lessonNum = $(this).data("lesson-num");
    console.log("Loading question for lesson:", lessonNum);

    const timestamp = new Date().toISOString();
    console.log(`Question requested at: ${timestamp}`);

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
        $("#questionContainer").data("question-timestamp", timestamp);

        $(".answer-btn").removeClass("selected correct incorrect");

        if (data.already_answered) {
          $("#resultText").text(data.feedback);
          $("#resultContainer").removeClass("correct incorrect");

          if (data.user_selection) {
            const selectedBtn = $(
              `.answer-btn[data-value='${data.user_selection}']`
            );
            selectedBtn.addClass("selected");
          }

          if (data.feedback === "Correct!") {
            $("#resultContainer").addClass("correct");
            if (data.user_selection) {
              const selectedBtn = $(
                `.answer-btn[data-value='${data.user_selection}']`
              );
              selectedBtn.addClass("correct");
            }
          } else {
            $("#resultContainer").addClass("incorrect");
            if (data.user_selection) {
              const selectedBtn = $(
                `.answer-btn[data-value='${data.user_selection}']`
              );
              selectedBtn.addClass("incorrect");
            }
            $("#correctAnswer").text(
              `The correct answer is: ${data.correct_answer}. `
            );
            $("#correctAnswer").show();
          }

          $("#resultContainer").show();
          $(".answer-btn").addClass("answered");
        } else {
          $(".answer-btn").removeClass("answered selected correct incorrect");
        }
      },
      error: function (xhr, status, error) {
        console.error("Error loading question:", error);
        alert("Failed to load question. Please try again.");
      },
    });
  });

  $(".answer-btn").click(function () {
    if ($(this).hasClass("answered")) {
      return;
    }

    const userAnswer = $(this).data("value");
    const lessonNum = $("#checkLearningBtn").data("lesson-num");
    const questionText = $("#questionContainer").data("current-question");
    const timestamp = new Date().toISOString();

    console.log(
      `User selected: ${userAnswer} (${typeof userAnswer}) for lesson ${lessonNum} at ${timestamp}`
    );

    $(".answer-btn").removeClass("selected");
    $(this).addClass("selected");

    $(".answer-btn").addClass("answered");

    $.ajax({
      url: `/check_answer/${lessonNum}`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        question: questionText,
        user_answer: userAnswer,
        timestamp: timestamp,
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

        const selectedBtn = $(
          `.answer-btn[data-value='${data.user_selection}']`
        );

        if (data.correct) {
          $("#resultContainer").addClass("correct");
          selectedBtn.addClass("correct");
        } else {
          $("#resultContainer").addClass("incorrect");
          selectedBtn.addClass("incorrect");
          $("#correctAnswer").text(
            `The correct answer is: ${data.correct_answer}. `
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

        $(".answer-btn").removeClass("answered");
      },
    });
  });

  if (window.feedbackData) {
    for (const [question, data] of Object.entries(window.feedbackData)) {
      $(".content-info")
        .find("div.content-text")
        .each(function () {
          const contentText = $(this).text();
          if (contentText.includes(question)) {
            const questionElement = $("<div>").addClass("question-answered");
            questionElement.append(
              $("<span>").addClass("question-text").text(question)
            );

            const resultElement = $("<span>")
              .addClass(
                data.result === "Correct!"
                  ? "result-correct"
                  : "result-incorrect"
              )
              .text(` (${data.result})`);

            questionElement.append(resultElement);

            if (data.user_selection) {
              questionElement.append(
                $("<span>")
                  .addClass("user-selection")
                  .text(` You selected: ${data.user_selection}`)
              );
            }

            if (data.result === "Incorrect.") {
              questionElement.append(
                $("<span>")
                  .addClass("correct-answer")
                  .text(` Correct answer: ${data.correct_answer}`)
              );
            }

            $(this).after(questionElement);
          }
        });
    }
  }
});
