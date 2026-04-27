import Form from "src/components/utilities/form";
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';

const BCrumb = [
  { to: '/dashboard', title: 'Home' },
  { title: 'Create Task' },
];

const CreateTaskPage = () => {
  return (
    <>
      <BreadcrumbComp title="Create A Task" items={BCrumb} />
      <Form />
    </>
  );
};

export default CreateTaskPage;
