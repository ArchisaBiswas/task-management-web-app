import { createContext, useContext, useState } from 'react';

export type PersonalTask = {
  id: string;
  task: string;
  dueDate: Date | undefined;
  priority: string; // lowercase
  status: string;   // lowercase
};

type PersonalTasksContextType = {
  personalTasks: PersonalTask[];
  addPersonalTask: (task: PersonalTask) => void;
  updatePersonalTask: (task: PersonalTask) => void;
};

const PersonalTasksContext = createContext<PersonalTasksContextType>({} as PersonalTasksContextType);

// Convenience hook for consuming the personal tasks context in any child component.
export const usePersonalTasks = () => useContext(PersonalTasksContext);

// Provides in-memory personal task state — tasks are not persisted to the backend.
export const PersonalTasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);

  // Appends a new task to the end of the list.
  const addPersonalTask = (task: PersonalTask) =>
    setPersonalTasks((prev) => [...prev, task]);

  // Replaces the task matching updated.id; leaves all other tasks unchanged.
  const updatePersonalTask = (updated: PersonalTask) =>
    setPersonalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  return (
    <PersonalTasksContext.Provider value={{ personalTasks, addPersonalTask, updatePersonalTask }}>
      {children}
    </PersonalTasksContext.Provider>
  );
};
