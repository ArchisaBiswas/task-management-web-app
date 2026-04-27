import userImg from '../../../assets/images/profile/user-1.jpg';
import supportImg from '../../../assets/images/dashboard/customer-support-img.png';
import { useAuth } from 'src/context/AuthContext';

const ProfileWelcome = () => {
  const { user } = useAuth();

  return (
    <div className="relative flex items-center justify-between bg-lightsecondary rounded-lg p-6">
      <div className="flex items-center gap-3">
        <div>
          <img src={userImg} alt="user-img" width={50} height={50} className="rounded-full" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h5 className="card-title">Welcome Back, {user?.name?.split(' ')[0] ?? 'there'}! 👋</h5>
          <p className="text-muted-foreground">Here is Your Dashboard</p>
        </div>
      </div>

      {/* Support Image */}
      <div className="hidden sm:block absolute right-8 bottom-0">
        <img src={supportImg} alt="support-img" width={145} height={95} />
      </div>
    </div>
  );
};

export default ProfileWelcome;
