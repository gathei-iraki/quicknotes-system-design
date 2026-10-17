const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    status: response.status
  };
}

function showStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function createNoteElement(note) {
  const listItem = document.createElement("li");
  const title = document.createElement("h3");
  const body = document.createElement("p");

  title.textContent = note.title;
  body.textContent = note.body;

  listItem.append(title, body);
  return listItem;
}

function displayNotes(notes) {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-state";
    emptyMessage.textContent = "No notes found.";
    notesList.append(emptyMessage);
    return;
  }

  const fragment = document.createDocumentFragment();

  notes.forEach((note) => {
    fragment.append(createNoteElement(note));
  });

  notesList.append(fragment);
}

async function loadNotes() {
  loadButton.disabled = true;
  showStatus("Loading notes...", "loading");

  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);

    displayNotes(notes);
    showStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    notesList.replaceChildren();
    showStatus("We could not load the notes. Please try again.", "error");
    console.error("Failed to load notes:", error);
  } finally {
    loadButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    showStatus("Please enter a title.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    showStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  showStatus("Creating note...", "loading");

  try {
    const { data: note, status } = await request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, body, userId: 1 })
    });

    const emptyMessage = notesList.querySelector(".empty-state");
    emptyMessage?.remove();
    notesList.prepend(createNoteElement(note));
    noteForm.reset();
    showStatus(`Note created (status ${status}, id ${note.id}).`, "success");
  } catch (error) {
    showStatus("We could not create the note. Please try again.", "error");
    console.error("Failed to create note:", error);
  } finally {
    submitButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
