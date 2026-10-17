const API_URL = "https://jsonplaceholder.typicode.com/posts";

const ENGLISH_DEMO_NOTES = [
  {
    title: "Plan the week",
    body: "Review the calendar, choose the top priorities, and schedule focused work time."
  },
  {
    title: "Project ideas",
    body: "Build a shared reading list, a habit tracker, or a simple budget dashboard."
  },
  {
    title: "Meeting notes",
    body: "Confirm the project scope, assign owners, and agree on the next review date."
  },
  {
    title: "Shopping list",
    body: "Buy coffee, rice, vegetables, fruit, and cleaning supplies."
  },
  {
    title: "Books to read",
    body: "Choose one technical book and one novel for this month."
  },
  {
    title: "Weekend tasks",
    body: "Clean the workspace, back up important files, and prepare meals for the week."
  },
  {
    title: "Learning goals",
    body: "Practise JavaScript, review REST API design, and write three SQL queries."
  },
  {
    title: "Travel checklist",
    body: "Pack identification, chargers, medication, comfortable clothes, and a water bottle."
  },
  {
    title: "Release checklist",
    body: "Run the tests, review accessibility, check monitoring, and prepare a rollback plan."
  },
  {
    title: "Daily reflection",
    body: "Write down what went well, what was difficult, and one improvement for tomorrow."
  }
];

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

  const data = response.status === 204 ? null : await response.json();

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
  const deleteButton = document.createElement("button");

  title.textContent = note.title;
  body.textContent = note.body;
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => {
    deleteNote(note.id, listItem, deleteButton);
  });

  listItem.append(title, body, deleteButton);
  return listItem;
}

function showEmptyState() {
  const emptyMessage = document.createElement("li");
  emptyMessage.className = "empty-state";
  emptyMessage.textContent = "No notes found.";
  notesList.append(emptyMessage);
}

function displayNotes(notes) {
  notesList.replaceChildren();

  if (notes.length === 0) {
    showEmptyState();
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
    // JSONPlaceholder supplies Latin-style filler text. Keep its IDs so DELETE
    // requests still target the fetched resources, but show readable demo copy.
    const englishNotes = notes.map((note, index) => {
      const englishCopy = ENGLISH_DEMO_NOTES[index];
      return englishCopy ? { ...note, ...englishCopy } : note;
    });

    displayNotes(englishNotes);
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

async function deleteNote(noteId, noteElement, deleteButton) {
  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";
  showStatus("Deleting note...", "loading");

  try {
    const { status } = await request(`${API_URL}/${noteId}`, {
      method: "DELETE"
    });

    // JSONPlaceholder simulates deletion but does not persist it. Removing the
    // item locally gives the user the expected result for this practice client.
    noteElement.remove();

    if (notesList.children.length === 0) {
      showEmptyState();
    }

    showStatus(`Note deleted (status ${status}).`, "success");
  } catch (error) {
    showStatus("We could not delete the note. Please try again.", "error");
    console.error("Failed to delete note:", error);
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
