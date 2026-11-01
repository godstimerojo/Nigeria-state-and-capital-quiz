import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "mywork",
  password: "123456",
  port: 5432,
});

const app = express();
const port = 3000;

db.connect();

let quiz = [];
db.query("SELECT * FROM nigeria_state", (err, res) => {
  if (err) {
    console.error("Error executing query", err.stack);
  } else {
    quiz = res.rows;
    console.log(quiz);
  }
});

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentQuestion = {};
let totalCorrect = 0;
let totalWrong = 0;

app.get("/", (req, res) => {
  currentQuestion = nextQuestion();

  res.render("index", { 
    question: currentQuestion,
    totalScore: totalCorrect,
    totalWrong: totalWrong 
  });
});

app.post("/submit", (req, res) => {
  let answer = req.body.answer.trim();
  let isCorrect = false;

  if (currentQuestion.capital.toLowerCase() === answer.toLowerCase()) {
    isCorrect = true;
    totalCorrect++;
  } else {
    totalWrong++;
  }

  if (totalWrong >= 2) {
    return res.render("index", {
      gameOver: true,
      totalScore: totalCorrect,
      totalWrong: totalWrong
    });
  }

  currentQuestion = nextQuestion();
  res.render("index", { 
    question: currentQuestion, 
    wasCorrect: isCorrect, 
    totalScore: totalCorrect,
    totalWrong: totalWrong 
  });
  console.log(isCorrect);
  console.log(totalCorrect);
});

app.get("/restart", (req, res) => {
    totalCorrect = 0;
    totalWrong = 0;
    previousQuestion = null;

    res.redirect("/");
});

let previousQuestion = null;
function nextQuestion() {
    let randomState;

    do {
        randomState = quiz[Math.floor(Math.random() * quiz.length)];
    } while (quiz.length > 1 && randomState === previousQuestion);

    previousQuestion = randomState;

    return randomState;
}


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})