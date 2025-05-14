"use client";
import React, { useEffect, useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconCalendarDue,
  IconDeviceDesktopAnalytics,
  IconDiabolo,
  IconPhoneCall,
  IconSettings,
  IconUserBolt,
  IconWorldWww,
  IconCreditCard,
  IconAdjustments,
  IconDeviceMobileMessage,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import LogoutModal from "@/components/ui/logout-modal";
import WebsiteMain from "@/app/_components/website/website";
import DashboardMain from "@/app/_components/dashboard/dashboard";
import { Logo } from "@/components/ui/logo";
import { Store } from "lucide-react";
import StoreMain from "@/app/_components/store/store";
import UsersMain from "@/app/_components/users/users";
import SubscriptionMain from "@/app/_components/subscriptions/subscriptions";
import USSD_DialerMain from "@/app/_components/ussd_dialer";
import SchedulerMain from "@/app/_components/scheduler";
import BlacklistMain from "@/app/_components/blacklist";
import SettingsMain from "@/app/_components/settings";
import ConvexMigration from "@/app/_components/migration";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionsMain } from "@/app/_components/transactions/transactions";
import FloatingNotification from "@/components/ui/floating-notification";

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const userId = pathname.split("/").pop() || "skip";

  const [navItem, setnavItem] = useState("");
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    undefined
  );
  const { signOut } = useAuth(); // Moved useAuth hook to the top level

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
    }
  }, [userId, router]);

  const dbUser = useQuery(api.users.getUserById, { userId });

  useEffect(() => {
    if (dbUser == undefined || dbUser == null) {
      router.push("/sign-in");
    }
    if (dbUser !== null && dbUser !== undefined) {
      if (dbUser.isSubscribed) {
        if (dbUser.isAdmin) {
          setnavItem("Dashboard");
        } else {
          setnavItem("Transactions");
        }
      } else {
        setnavItem("Subscription");
      }
    }
  }, [dbUser, router]);

  if (!userId || dbUser == undefined || dbUser == null) {
    return null;
  }

  const [isModalOpen, setModalOpen] = useState(false);

  const handleLogout = () => {
    setModalOpen(false);
    router.push("/");
    signOut().catch((error) => {
      console.error("Logout failed:", error);
    });
  };

  const generalLinks = [
    {
      label: "Subscription",
      href: "#",
      icon: (
        <IconDiabolo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Transactions",
      href: "#",
      icon: (
        <IconCreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "USSD Dialer",
      href: "#",
      icon: (
        <IconPhoneCall className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Scheduler",
      href: "#",
      icon: (
        <IconCalendarDue className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Store",
      href: "#",
      icon: (
        <Store className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Website",
      href: "#",
      icon: (
        <IconWorldWww className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    // {
    //   label: "Blacklist",
    //   href: "#",
    //   icon: (
    //     <IconForbid className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    //   ),
    // },
    {
      label: "Settings",
      href: "#",
      icon: (
        <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  const adminLinks = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <IconBrandTabler className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },

    {
      label: "Users",
      href: "#",
      icon: (
        <IconUserBolt className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "SMS Broadcast",
      href: "#",
      icon: (
        <IconDeviceMobileMessage className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },

    {
      label: "Data Migration",
      href: "#",
      icon: (
        <IconDeviceDesktopAnalytics className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  const [open, setOpen] = useState(false);

  const isSubscribed =
    dbUser.isSubscribed || userId === "user_2r7LUUlDnylYJnMMytKl7qzwY0c";
  const isAdmin =
    dbUser.isAdmin || userId === "user_2r7LUUlDnylYJnMMytKl7qzwY0c";

  return (
    <div
      className={cn(
        "md:rounded-lg shadow-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 flex-1 border border-neutral-200 dark:border-neutral-700 overflow-hidden m-1 md:m-16 h-[80%]"
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10 lg:pl-6">
          <div className="flex flex-col flex-1  overflow-hidden">
            <Logo
              fullName={dbUser.name}
              email={dbUser.email}
              profileImage={dbUser.profileImage}
            />
            <div className="mt-4 flex flex-col gap-2 overflow-hidden">
              <ScrollArea color="#FFFFFFFF" className="px-4 ">
                <div className="hidden lg:block font-normal text-md text-neutral-700">
                  General
                </div>
                {generalLinks.map((link, idx) => (
                  <SidebarLink
                    onClick={() => {
                      if (isSubscribed || link.label === "Subscription") {
                        setnavItem(link.label);
                        setOpen(false);
                        setAccordionValue(undefined);
                      }
                    }}
                    key={idx}
                    link={link}
                    className={cn(
                      "pl-3 hover:bg-gray-200/70 rounded-md",
                      navItem === link.label && "bg-gray-300/50",
                      !isSubscribed &&
                        link.label !== "Subscription" &&
                        "opacity-50 pointer-events-none"
                    )}
                    disabled={!isSubscribed && link.label !== "Subscription"}
                  />
                ))}

                {isAdmin && (
                  <>
                    <div className="hidden lg:block font-normal text-md text-neutral-700">
                      Management
                    </div>
                    <Accordion
                      type="single"
                      collapsible
                      value={accordionValue}
                      onValueChange={setAccordionValue}
                      className="border-none"
                    >
                      <AccordionItem
                        value="admin-actions"
                        className="border-none"
                      >
                        <AccordionTrigger className="flex items-center gap-2 pl-3 py-2 hover:bg-gray-200/70 rounded-md justify-start hover:no-underline">
                          <IconAdjustments className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                          <span className="hover:underline">Admin Actions</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          {adminLinks.map((link, idx) => (
                            <SidebarLink
                              onClick={() => {
                                setnavItem(link.label);
                                setOpen(false);
                              }}
                              key={idx}
                              link={link}
                              className={cn(
                                "pl-6 hover:bg-gray-200/70 rounded-md text-left hover:underline",
                                navItem === link.label && "bg-gray-300/50"
                              )}
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </>
                )}
              </ScrollArea>
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Log out",
                href: "#",
                icon: (
                  <IconArrowLeft className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                ),
              }}
              onClick={() => setModalOpen(true)}
            />
            <LogoutModal
              isOpen={isModalOpen}
              onClose={() => setModalOpen(false)}
              onConfirm={handleLogout}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="z-30 w-full !h-full flex flex-col lg:mr-1 lg:pb-1">
        <FloatingNotification message="Some settings were changes. Kindly connect your agent smartphone to internet for syncing."/>
        {navItem === "Dashboard" && isAdmin && <DashboardMain />}
        {navItem === "USSD Dialer" && <USSD_DialerMain user={dbUser} />}
        {navItem === "Blacklist" && <BlacklistMain user={dbUser} />}
        {navItem === "Scheduler" && <SchedulerMain user={dbUser} />}
        {navItem === "Subscription" && <SubscriptionMain user={dbUser} />}
        {navItem === "Users" && isAdmin && <UsersMain />}
        {navItem === "Settings" && <SettingsMain user={dbUser} />}
        {navItem === "Store" && <StoreMain userId={userId} />}
        {navItem === "Transactions" && <TransactionsMain userId={userId} />}
        {navItem === "Website" && <WebsiteMain userId={userId} />}
        {navItem === "Data Migration" && isAdmin && <ConvexMigration />}
      </div>
    </div>
  );
}
