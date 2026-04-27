






import Logo from "src/assets/images/logos/light-logo.png";
import Logowhite from "src/assets/images/logos/dark-logo.png";


const FullLogo = () => {
  return (


    <>
      {/* Dark Logo   */}
      <img src={Logo} alt="logo" className="block dark:hidden rtl:scale-x-[-1]" />
      {/* Light Logo  */}
      <img src={Logowhite} alt="logo" className="hidden dark:block rtl:scale-x-[-1]" />
    </>
  );
};

export default FullLogo;
