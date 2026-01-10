import Note from '../models/Note.js';
import Task from '../models/Task.js';

const resolvers = {
    getNotes: async () => {
        try {
            const notes = await Note.find().sort({ createdAt: -1 });
            return notes.map(note => ({
                ...note._doc,
                id: note._id.toString(),
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString()
            }));
        } catch (error) {
            throw new Error('Error fetching notes');
        }
    },

    getTasks: async () => {
        try {
            const tasks = await Task.find().sort({ createdAt: -1 });
            return tasks.map(task => ({
                ...task._doc,
                id: task._id.toString(),
                createdAt: task.createdAt.toISOString(),
                updatedAt: task.updatedAt.toISOString()
            }));
        } catch (error) {
            throw new Error('Error fetching tasks');
        }
    },

    addNote: async ({ input }) => {
        try {
            // Find a user to assign as owner (since auth is skipped for this bonus task demo)
            const User = (await import('../models/User.js')).default;
            const user = await User.findOne();

            if (!user) {
                throw new Error('No user found to assign note to. Please create a user first.');
            }

            const newNote = new Note({
                title: input.title,
                content: input.content,
                tags: input.tags,
                category: input.category,
                owner: user._id
            });

            const savedNote = await newNote.save();
            return {
                ...savedNote._doc,
                id: savedNote._id.toString(),
                createdAt: savedNote.createdAt.toISOString(),
                updatedAt: savedNote.updatedAt.toISOString()
            };
        } catch (error) {
            console.error(error);
            throw new Error('Error adding note: ' + error.message);
        }
    }
};

export default resolvers;
