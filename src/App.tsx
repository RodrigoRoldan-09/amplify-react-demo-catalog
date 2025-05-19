import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  // Remove the unused state variable since we're not using it
  // const [editingId, setEditingId] = useState<string | null>(null);
    
  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }
  
  function editTodo(id: string, currentContent: string) {
    const newContent = window.prompt("Edit todo content", currentContent);
    if (newContent !== null && newContent !== currentContent) {
      client.models.Todo.update({
        id,
        content: newContent
      });
    }
  }

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span>{todo.content}</span>
            <div>
              {/* Add a null check for todo.id to handle potential undefined values */}
              <button onClick={() => todo.id && editTodo(todo.id, todo.content || "")}>Edit</button>
              <button onClick={() => todo.id && deleteTodo(todo.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating, editing, or deleting a todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;