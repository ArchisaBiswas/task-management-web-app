
import CardBox from "../../shared/CardBox"
import iconConnect from "src/assets/images/svgs/icon-connect.svg"
import iconSpeechBubble from "src/assets/images/svgs/icon-speech-bubble.svg"
import iconFavorites from "src/assets/images/svgs/icon-favorites.svg"
import iconMailbox from "src/assets/images/svgs/icon-mailbox.svg"
import iconUser from "src/assets/images/svgs/icon-user-male.svg"
import { Link } from "react-router"

const TopCards = ({ allTasksCount, completedCount, pendingCount, priorityCount, nonPriorityCount }: { allTasksCount?: number; completedCount?: number; pendingCount?: number; priorityCount?: number; nonPriorityCount?: number }) => {

  const TopCardInfo = [
    {
      key: "card1",
      title: "All Tasks",
      desc: allTasksCount !== undefined ? String(allTasksCount) : "4+",
      img: iconConnect,
      bgcolor: "bg-info/10 dark:bg-info/10",
      textclr: "text-info dark:text-info",
      url: "/apps/notes"
    },
    {
      key: "card2",
      title: "Completed",
      desc: completedCount !== undefined ? String(completedCount) : "+1K",
      img: iconSpeechBubble,
      bgcolor: "bg-success/10 dark:bg-success/10",
      textclr: "text-success dark:text-success",
      url: "/icons/iconify"
    },
    {
      key: "card3",
      title: "Pending",
      desc: pendingCount !== undefined ? String(pendingCount) : "10+",
      img: iconFavorites,
      bgcolor: "bg-error/10 dark:bg-error/10",
      textclr: "text-error dark:text-error",
      url: "/apps/blog/post"
    },
    {
      key: "card4",
      title: "Priority Tasks",
      desc: priorityCount !== undefined ? String(priorityCount) : "8+",
      img: iconMailbox,
      bgcolor: "bg-secondary/10 dark:bg-secondary/10",
      textclr: "text-primary dark:text-primary",
      url: "/apps/tickets"
    },
    {
      key: "card5",
      title: "Non-Priority Tasks",
      desc: nonPriorityCount !== undefined ? String(nonPriorityCount) : "96",
      img: iconUser,
      bgcolor: "bg-primary/10 dark:bg-lightprimary",
      textclr: "text-primary dark:text-primary",
      url: "/utilities/table"
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {TopCardInfo.map((item) => (
        <Link to={item.url} key={item.key}>
          <CardBox className={`shadow-none ${item.bgcolor} w-full border-none`}>
            <div className="text-center hover:scale-105 transition-all ease-in-out">
              <div className="flex justify-center">
                <img src={item.img} width="50" height="50" className="mb-3" alt="profile-image" />
              </div>
              <p className={`font-semibold ${item.textclr} mb-1`}>{item.title}</p>
              <h5 className={`text-lg font-semibold ${item.textclr} mb-0`}>{item.desc}</h5>
            </div>
          </CardBox>
        </Link>
      ))}
    </div>
  )
}
export { TopCards }
