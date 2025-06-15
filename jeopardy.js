// You only need to touch comments with the todo of this file to complete the assignment!

/*
=== How to build on top of the starter code? ===

Problems have multiple solutions.
We have created a structure to help you on solving this problem.
On top of the structure, we created a flow shaped via the below functions.
We left descriptions, hints, and to-do sections in between.
If you want to use this code, fill in the to-do sections.
However, if you're going to solve this problem yourself in different ways, you can ignore this starter code.
 */

/*
=== Terminology for the API ===

Clue: The name given to the structure that contains the question and the answer together.
Category: The name given to the structure containing clues on the same topic.
 */

/*
=== Data Structure of Request the API Endpoints ===

/categories:
[
  {
    "id": <category ID>,
    "title": <category name>,
    "clues_count": <number of clues in the category where each clue has a question, an answer, and a value>
  },
  ... more categories
]

/category:
{
  "id": <category ID>,
  "title": <category name>,
  "clues_count": <number of clues in the category>,
  "clues": [
    {
      "id": <clue ID>,
      "answer": <answer to the question>,
      "question": <question>,
      "value": <value of the question>,
      ... more properties
    },
    ... more clues
  ]
}
 */

const API_URL = "https://rithm-jeopardy.herokuapp.com/api/"; // API base
const NUM_CATS = 6; // categories to show
const NUM_CLUES = 5; // clues per category

let gameData = []; // stores categories & clues
let currentClue = null; // currently selected clue
let clueState = 0; // 0 = idle, 1 = Q shown, 2 = A shown
let canClickPlay = true; // allow restart

// Once the page fully loads, setup click listeners
// for the start button and clue display box.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("play").addEventListener("click", startGame);
  document
    .getElementById("active-clue")
    .addEventListener("click", revealOrClear);
});

// This function runs when you click the start button.
// If the game is already in progress, ignore the click.
function startGame() {
  if (!canClickPlay) return; // already clicked, don't restart
  canClickPlay = false; // lock button until setup is done
  initGame(); // kick off the setup
}

// Starts everything from scratch — clears UI and fetches new data.
async function initGame() {
  document.querySelector("thead").innerHTML = ""; // clear category headers
  document.querySelector("tbody").innerHTML = ""; // clear clue cards
  document.getElementById("active-clue").innerHTML = ""; // clear question box
  document.getElementById("play").textContent = "Loading..."; // temp label
  gameData = []; // reset game data array

  // Grab a list of usable category IDs
  const ids = await fetchCategoryIds();

  // for each ID, grab its clue info and save it
  for (let id of ids) {
    const catInfo = await fetchCategory(id);
    gameData.push(catInfo); // build up the main data array
  }

  drawBoard(gameData); // now build the table on screen
  document.getElementById("play").textContent = "Restart the Game!";
}

// Fetches 100 categories, filters to only ones with enough clues.
async function fetchCategoryIds() {
  const res = await axios.get(`${API_URL}categories?count=100`); // get raw list

  // filter down to ones that have at least NUM_CLUES (5)
  const options = res.data.filter((c) => c.clues_count >= NUM_CLUES);

  const ids = [];
  // randomly grab NUM_CATS (6) IDs that are valid
  while (ids.length < NUM_CATS) {
    const idx = Math.floor(Math.random() * options.length);
    ids.push(options.splice(idx, 1)[0].id); // pull one ID from the list
  }
  return ids;
}

// Given a category ID, get its name + 5 clues
async function fetchCategory(catId) {
  const res = await axios.get(`${API_URL}category?id=${catId}`);

  // take first 5 clues that have both a question AND an answer
  const clues = res.data.clues
    .filter((cl) => cl.question && cl.answer)
    .slice(0, NUM_CLUES)
    .map((cl, i) => ({
      id: cl.id,
      question: cl.question,
      answer: cl.answer,
      value: (i + 1) * 100, // value like $100, $200, etc.
    }));

  return {
    id: res.data.id,
    title: res.data.title,
    clues,
  };
}

// Dynamically builds the table layout based on gameData
function drawBoard(data) {
  const head = document.querySelector("thead");
  const body = document.querySelector("tbody");

  // Add category names as header row
  const topRow = document.createElement("tr");
  data.forEach((cat) => {
    const th = document.createElement("th");
    th.textContent = cat.title.toUpperCase(); // uppercase looks better
    th.className = "genre-title";
    topRow.appendChild(th);
  });
  head.appendChild(topRow);

  // Now add rows of clues, each row is a value level (e.g. $100, $200)
  for (let i = 0; i < NUM_CLUES; i++) {
    const tr = document.createElement("tr");
    data.forEach((cat) => {
      const cl = cat.clues[i];
      const td = document.createElement("td");
      td.textContent = `$${cl.value}`; // clue value
      td.className = "card";
      td.id = `${cat.id}-${cl.id}`; // unique ID combo
      td.addEventListener("click", clueClick);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

// When a clue square is clicked, show the question
function clueClick(e) {
  if (clueState !== 0) return; // if already showing a clue, do nothing

  const [catId, clueId] = e.target.id.split("-").map(Number); // extract IDs
  const cat = gameData.find((c) => c.id === catId); // find category
  const idx = cat.clues.findIndex((c) => c.id === clueId); // find clue in it
  const clue = cat.clues[idx];

  if (!clue) return; // if somehow not found, exit

  currentClue = clue;
  clueState = 1;

  const box = document.getElementById("active-clue");
  box.innerHTML = clue.question; // show the question in the clue box

  e.target.classList.add("viewed"); // mark cell as viewed
  e.target.removeEventListener("click", clueClick); // no double clicks

  cat.clues.splice(idx, 1); // remove this clue from available ones
  if (cat.clues.length === 0) {
    gameData = gameData.filter((c) => c.id !== catId); // remove category if empty
  }

  console.log("Question shown:", clue.question); // debug log
}

// Handles second click on clue: shows answer, or clears if done
function revealOrClear() {
  const box = document.getElementById("active-clue");
  if (clueState === 1) {
    box.innerHTML = currentClue.answer; // show answer
    clueState = 2;
  } else if (clueState === 2) {
    box.innerHTML = "";
    clueState = 0;

    // If no more clues left, allow restart
    if (gameData.length === 0) {
      canClickPlay = true;
      document.getElementById("play").textContent = "Restart the Game!";
      box.textContent = "The End!";
    }
  }
}
