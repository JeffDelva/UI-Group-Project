$(document).ready(function () {
  $("#checkLearningBtn").click(function () {
    $("#questionContainer").hide();
    $("#resultContainer").hide();
    $("#correctAnswer").hide();

    const lessonNum = $(this).data("lesson-num");
    console.log("Loading question for lesson:", lessonNum);

    // Track the user interaction with timestamp
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
        // Store timestamp with the question
        $("#questionContainer").data("question-timestamp", timestamp);

        // Reset button states
        $(".answer-btn").removeClass("selected correct incorrect");

        // If this question has already been answered, immediately show the result
        // and highlight the user's selection
        if (data.already_answered) {
          $("#resultText").text(data.feedback);
          $("#resultContainer").removeClass("correct incorrect");

          // Highlight the user's selected button
          if (data.user_selection) {
            const selectedBtn = $(
              `.answer-btn[data-value='${data.user_selection}']`
            );
            selectedBtn.addClass("selected");
          }

          if (data.feedback === "Correct!") {
            $("#resultContainer").addClass("correct");
            // If correct, also add correct class to the selected button
            if (data.user_selection) {
              const selectedBtn = $(
                `.answer-btn[data-value='${data.user_selection}']`
              );
              selectedBtn.addClass("correct");
            }
          } else {
            $("#resultContainer").addClass("incorrect");
            // If incorrect, add incorrect class to the selected button
            if (data.user_selection) {
              const selectedBtn = $(
                `.answer-btn[data-value='${data.user_selection}']`
              );
              selectedBtn.addClass("incorrect");
            }
            $("#correctAnswer").text(
              `The correct answer is: ${data.correct_answer}`
            );
            $("#correctAnswer").show();
          }

          $("#resultContainer").show();
          // Don't disable the buttons, but mark them as already selected
          $(".answer-btn").addClass("answered");
        } else {
          // If not answered, make sure buttons are enabled and not marked
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
    // If the question has already been answered, don't process again
    if ($(this).hasClass("answered")) {
      return;
    }

    const userAnswer = $(this).data("value");
    const lessonNum = $("#checkLearningBtn").data("lesson-num");
    const questionText = $("#questionContainer").data("current-question");
    const timestamp = new Date().toISOString(); // Record answer timestamp

    console.log(
      `User selected: ${userAnswer} (${typeof userAnswer}) for lesson ${lessonNum} at ${timestamp}`
    );

    // Mark the selected button
    $(".answer-btn").removeClass("selected");
    $(this).addClass("selected");

    // Mark all buttons as answered to prevent multiple submissions
    $(".answer-btn").addClass("answered");

    $.ajax({
      url: `/check_answer/${lessonNum}`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        question: questionText,
        user_answer: userAnswer,
        timestamp: timestamp // Include timestamp in data sent to server
      }),
      success: function (data) {
        if (data.error) {
          console.error("Error from server:", data.error);
          alert(data.error);
          return;
        }

        console.log("Response from server:", data);

        // Update the score display
        updateScoreDisplay();

        $("#resultText").text(data.feedback);
        $("#resultContainer").removeClass("correct incorrect");

        // Add the correct class to the selected button
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

        // Remove the answered class in case of error
        $(".answer-btn").removeClass("answered");
      },
    });
  });

  // Function to update the score display
  function updateScoreDisplay() {
    $.ajax({
      url: "/current_lesson",
      method: "GET",
      success: function (data) {
        $("#scoreDisplay").text(`Correct Answers: ${data.correct_answers}`);
      },
    });
  }

  // Initialize score display when page loads
  updateScoreDisplay();

  // Check if there are any previously answered questions on the page
  // and highlight them
  if (window.feedbackData) {
    for (const [question, data] of Object.entries(window.feedbackData)) {
      // Create a special marker for answered questions in the content
      $(".lesson-text")
        .find("div.content-text")
        .each(function () {
          const contentText = $(this).text();
          if (contentText.includes(question)) {
            // Append the answer status after the question
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

            // Add the user's selection
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