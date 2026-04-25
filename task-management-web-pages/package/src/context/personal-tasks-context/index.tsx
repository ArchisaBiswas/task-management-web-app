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

export const usePersonalTasks = () => useContext(PersonalTasksContext);

export const PersonalTasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);

  const addPersonalTask = (task: PersonalTask) =>
    setPersonalTasks((prev) => [...prev, task]);

  const updatePersonalTask = (updated: PersonalTask) =>
    setPersonalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  return (
    <PersonalTasksContext.Provider value={{ personalTasks, addPersonalTask, updatePersonalTask }}>
      {children}
    </PersonalTasksContext.Provider>
  );
};
