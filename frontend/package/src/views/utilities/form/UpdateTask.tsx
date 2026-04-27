import UpdateTaskForm from 'src/components/utilities/form/UpdateTaskForm';
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [
  { to: '/dashboard', title: 'Home' },
  { title: 'Update Task' },
];

const UpdateTask = () => {
  return (
    <>
      <BreadcrumbComp title="Update A Task" items={BCrumb} />
      <UpdateTaskForm />
    </>
  );
};

export default UpdateTask;
