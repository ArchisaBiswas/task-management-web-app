import UpdateMyTaskForm from 'src/components/utilities/form/UpdateMyTaskForm';
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Update My Task' },
];

const UpdateMyTask = () => {
  return (
    <>
      <BreadcrumbComp title="Update My Task" items={BCrumb} />
      <UpdateMyTaskForm />
    </>
  );
};

export default UpdateMyTask;
