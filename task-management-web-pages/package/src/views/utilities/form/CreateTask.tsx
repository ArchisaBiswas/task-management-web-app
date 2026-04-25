import CreateTaskForm from "src/components/utilities/form/CreateTaskForm";
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Add My Task' },
];

const CreateTask = () => {
  return (
    <>
      <BreadcrumbComp title="Add My Task" items={BCrumb} />
      <CreateTaskForm />
    </>
  );
};

export default CreateTask;
