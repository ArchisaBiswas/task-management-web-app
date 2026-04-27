import CreateTaskForm from "src/components/utilities/form/CreateTaskForm";
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [
  { to: '/all-tasks', title: 'Home' },
  { title: 'Create My Task' },
];

const CreateTask = () => {
  return (
    <>
      <BreadcrumbComp title="Create My Task" items={BCrumb} />
      <CreateTaskForm />
    </>
  );
};

export default CreateTask;
