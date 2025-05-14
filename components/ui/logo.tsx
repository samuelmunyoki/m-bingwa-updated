import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconExchange } from "@tabler/icons-react";

export const Logo = ({
  profileImage,
  fullName,
  email
}: {
  profileImage: string;
  fullName: string;
  email: string;
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-center lg:justify-start font-normal text-md w-full text-center text-neutral-700">Account</div>
      <div className="gap-3 flex flex-row items-center justify-center md:pl-3 md:pt-2">
        <Avatar className="cursor-pointer w-10 h-10 border-slate-800">
          <AvatarImage src={profileImage} />
          <AvatarFallback className="bg-black text-white">CN</AvatarFallback>
        </Avatar>

        <div className=" flex flex-col w-[80%]">
          <div className="text-gray-700 -my-1 overflow-hidden whitespace-nowrap overflow-ellipsis">
            {fullName}
          </div>
          <div className="text-sm font-light text-gray-500/80 overflow-hidden whitespace-nowrap overflow-ellipsis">
            {email}
          </div>
        </div>
      </div>
    </div>
  );
};
