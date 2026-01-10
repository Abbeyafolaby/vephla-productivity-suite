import { buildSchema } from 'graphql';

const schema = buildSchema(`
  type User {
    id: ID!
    username: String!
    email: String!
  }

  type Note {
    id: ID!
    title: String!
    content: String!
    tags: [String]
    category: String
    createdAt: String
    updatedAt: String
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String
    priority: String
    dueDate: String
    tags: [String]
    createdAt: String
    updatedAt: String
  }

  input NoteInput {
    title: String!
    content: String!
    tags: [String]
    category: String
  }

  input TaskInput {
    title: String!
    description: String
    status: String
    priority: String
    dueDate: String
    tags: [String]
  }

  type Query {
    getNotes: [Note]
    getTasks: [Task]
  }

  type Mutation {
    addNote(input: NoteInput): Note
    # NEW: Add Task Mutation
    addTask(input: TaskInput): Task
  }
`);

export default schema;