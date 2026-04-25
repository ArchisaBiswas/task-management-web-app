import { Icon } from "@iconify/react/dist/iconify.js"
import { useState, useEffect } from "react";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import CardBox from "src/components/shared/CardBox";
import profileImg from "src/assets/images/profile/user-1.jpg"
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import { useAuth, AuthUser } from "src/context/AuthContext";

const UserProfile = () => {
    const { user, login } = useAuth();
    const [openModal, setOpenModal] = useState(false);
    const [modalType, setModalType] = useState<"personal" | "address" | null>(null);

    const BCrumb = [
        {
            to: "/",
            title: "Home",
        },
        {
            title: "User Information",
        },
    ];

    const nameParts = (user?.name ?? '').split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');

    const [personal, setPersonal] = useState({
        firstName,
        lastName,
        email: user?.email ?? '',
        role: user?.role ?? '',
        timeZone: user?.timezone ?? '',
    });

    const [address, setAddress] = useState({
        location: "United States",
        state: "San Diego, California, United States",
        pin: "92101",
        zip: "30303",
        taxNo: "GA45273910"
    });

    const [tempPersonal, setTempPersonal] = useState(personal);
    const [tempAddress, setTempAddress] = useState(address);

    useEffect(() => {
        if (openModal && modalType === "personal") {
            setTempPersonal(personal);
        }
        if (openModal && modalType === "address") {
            setTempAddress(address);
        }
    }, [openModal, modalType, personal, address]);

    const handleSave = async () => {
        if (modalType === "personal") {
            const newName = `${tempPersonal.firstName} ${tempPersonal.lastName}`.trim();
            const res = await fetch(`/api/users/${user!.user_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: tempPersonal.email,
                    timezone: tempPersonal.timeZone,
                }),
            });
            if (!res.ok) {
                alert('Failed to update profile. Please try again.');
                return;
            }
            setPersonal(tempPersonal);
            login({ ...user!, name: newName, email: tempPersonal.email, timezone: tempPersonal.timeZone } as AuthUser);
        } else if (modalType === "address") {
            setAddress(tempAddress);
        }
        setOpenModal(false);
    };

    return (
        <>
            <BreadcrumbComp title="User Profile" items={BCrumb} />
            <div className="flex flex-col gap-6">
                <CardBox className="p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl relative w-full break-words">
                        <div>
                            <img src={profileImg} alt="image" width={80} height={80} className="rounded-full" />
                        </div>
                        <div className="flex flex-wrap gap-4 justify-center sm:justify-between items-center w-full">
                            <div className="flex flex-col sm:text-left text-center gap-1.5">
                                <h5 className="card-title">{personal.firstName} {personal.lastName}</h5>
                                <div className="flex flex-wrap items-center gap-1 md:gap-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{personal.role}</p>
                                    <div className="hidden h-4 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{address.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardBox>

                <div className="flex justify-center gap-6">
                    <CardBox className="p-6 overflow-hidden w-full xl:max-w-xl">
                        <h5 className="card-title mb-6">Personal Information</h5>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32 mb-6">
                            <div><p className="text-xs text-gray-500">First Name</p><p>{personal.firstName}</p></div>
                            <div><p className="text-xs text-gray-500">Last Name</p><p>{personal.lastName}</p></div>
                            <div><p className="text-xs text-gray-500">Email</p><p>{personal.email}</p></div>
                            <div><p className="text-xs text-gray-500">Local Time Zone</p><p>{personal.timeZone}</p></div>
                            {/* <div><p className="text-xs text-gray-500">Position</p><p>{personal.position}</p></div> */}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => { setModalType("personal"); setOpenModal(true); }} color={"primary"} className="flex items-center gap-1.5 rounded-md">
                                <Icon icon="ic:outline-edit" width="18" height="18" /> Edit
                            </Button>
                        </div>
                    </CardBox>

                    {/* <CardBox className="p-6 overflow-hidden">
                        <h5 className="card-title mb-6">Address Details</h5>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32 mb-6">
                            <div><p className="text-xs text-gray-500">Location</p><p>{address.location}</p></div>
                            <div><p className="text-xs text-gray-500">Province / State</p><p>{address.state}</p></div>
                            <div><p className="text-xs text-gray-500">PIN Code</p><p>{address.pin}</p></div>
                            <div><p className="text-xs text-gray-500">ZIP</p><p>{address.zip}</p></div>
                            <div><p className="text-xs text-gray-500">Federal Tax No.</p><p>{address.taxNo}</p></div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => { setModalType("address"); setOpenModal(true); }} color={"primary"} className="flex items-center gap-1.5 rounded-md">
                                <Icon icon="ic:outline-edit" width="18" height="18" /> Edit
                            </Button>
                        </div>
                    </CardBox> */}
                </div>
            </div>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="mb-4">
                            {modalType === "personal" ? "Edit Personal Information" : "Edit Address Details"}
                        </DialogTitle>
                    </DialogHeader>

                    {modalType === "personal" ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    placeholder="First Name"
                                    value={tempPersonal.firstName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, firstName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Last Name"
                                    value={tempPersonal.lastName}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, lastName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    placeholder="Email"
                                    value={tempPersonal.email}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, email: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="timeZone">Local Time Zone</Label>
                                <Input
                                    id="timeZone"
                                    placeholder="e.g. America/Los_Angeles"
                                    value={tempPersonal.timeZone}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, timeZone: e.target.value })}
                                />
                            </div>
                            {/* <div className="flex flex-col gap-2">
                                <Label htmlFor="facebook">Facebook URL</Label>
                                <Input
                                    id="facebook"
                                    placeholder="Facebook URL"
                                    value={tempPersonal.facebook}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, facebook: e.target.value })}
                                />
                            </div> */}
                            {/* <div className="flex flex-col gap-2">
                                <Label htmlFor="twitter">Twitter URL</Label>
                                <Input
                                    id="twitter"
                                    placeholder="Twitter URL"
                                    value={tempPersonal.twitter}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, twitter: e.target.value })}
                                />
                            </div> */}
                            {/* <div className="flex flex-col gap-2">
                                <Label htmlFor="github">GitHub URL</Label>
                                <Input
                                    id="github"
                                    placeholder="GitHub URL"
                                    value={tempPersonal.github}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, github: e.target.value })}
                                />
                            </div> */}
                            {/* <div className="flex flex-col gap-2">
                                <Label htmlFor="dribbble">Dribbble URL</Label>
                                <Input
                                    id="dribbble"
                                    placeholder="Dribbble URL"
                                    value={tempPersonal.dribbble}
                                    onChange={(e) => setTempPersonal({ ...tempPersonal, dribbble: e.target.value })}
                                />
                            </div> */}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    placeholder="Location"
                                    value={tempAddress.location}
                                    onChange={(e) => setTempAddress({ ...tempAddress, location: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="state">Province / State</Label>
                                <Input
                                    id="state"
                                    placeholder="Province / State"
                                    value={tempAddress.state}
                                    onChange={(e) => setTempAddress({ ...tempAddress, state: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="pin">PIN Code</Label>
                                <Input
                                    id="pin"
                                    placeholder="PIN Code"
                                    value={tempAddress.pin}
                                    onChange={(e) => setTempAddress({ ...tempAddress, pin: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="zip">ZIP</Label>
                                <Input
                                    id="zip"
                                    placeholder="ZIP"
                                    value={tempAddress.zip}
                                    onChange={(e) => setTempAddress({ ...tempAddress, zip: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="taxNo">Federal Tax No.</Label>
                                <Input
                                    id="taxNo"
                                    placeholder="Federal Tax No."
                                    value={tempAddress.taxNo}
                                    onChange={(e) => setTempAddress({ ...tempAddress, taxNo: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 mt-4">
                        <Button color={"primary"} className="rounded-md" onClick={handleSave}>
                            Save Changes
                        </Button>
                        <Button color={"lighterror"} className="rounded-md bg-lighterror dark:bg-darkerror text-error hover:bg-error hover:text-white" onClick={() => setOpenModal(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserProfile;
