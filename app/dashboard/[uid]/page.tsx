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
  IconChartBar,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import LogoutModal from "@/components/ui/logout-modal";
import CompleteProfileModal from "@/components/ui/complete-profile-modal";
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
import StatisticsMain from "@/app/_components/statistics";
import ConvexMigration from "@/app/_components/migration";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionsMain } from "@/app/_components/transactions/transactions";
import BalanceBar from "@/app/_components/balance/BalanceBar";

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const userId = pathname.split("/").pop() || "skip";

  const [navItem, setnavItem] = useState("");
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    undefined
  );
  const { signOut } = useAuth();

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [phoneModalError, setPhoneModalError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");
  const updateAgentNumber = useMutation(api.users.updateAgentNumber);
  const sendPhoneOtp = useAction(api.actions.phoneVerification.sendPhoneVerificationOtp);
  const verifyPhoneOtp = useMutation(api.features.otps.verifyOtp);
  const [isModalOpen, setModalOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
    }
  }, [userId, router]);

  const dbUser = useQuery(api.users.getUserById, { userId });

  // ── Web session guard ─────────────────────────────────────────────────────
  const registerWebSession = useMutation(api.users.registerWebSession);
  const liveWebToken = useQuery(
    api.users.getWebSessionToken,
    userId !== "skip" ? { userId } : "skip"
  );

  useEffect(() => {
    if (userId === "skip") return;
    const stored = localStorage.getItem("wsToken");
    if (!stored) {
      // First login on this browser — register a new session
      registerWebSession({ userId }).then((res: any) => {
        if (res?.token) localStorage.setItem("wsToken", res.token);
      });
    }
  }, [userId]);

  useEffect(() => {
    if (!liveWebToken) return;
    const stored = localStorage.getItem("wsToken");
    if (stored && stored !== liveWebToken) {
      // Another browser logged in — kick this one out
      localStorage.removeItem("wsToken");
      signOut().then(() => router.push("/sign-in?reason=session_replaced"));
    }
  }, [liveWebToken]);
  // ─────────────────────────────────────────────────────────────────────────

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

      // Show phone number prompt if missing
      if (!dbUser.phoneNumber) {
        setShowPhoneModal(true);
      }
    }
  }, [dbUser, router]);

  const handleSendOtp = async (phoneNumber: string) => {
    setIsSendingOtp(true);
    setPhoneModalError(null);
    try {
      const result = await sendPhoneOtp({ phoneNumber: phoneNumber.trim(), userId });
      if (result.success) {
        setPendingPhone(phoneNumber.trim());
        setPhoneOtpSent(true);
      } else {
        setPhoneModalError(result.message ?? "Failed to send OTP.");
      }
    } catch {
      setPhoneModalError("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsVerifyingOtp(true);
    setPhoneModalError(null);
    try {
      const result = await verifyPhoneOtp({ otpCode: otp });
      if (result.success) {
        await updateAgentNumber({ userId, phoneNumber: pendingPhone });
        setShowPhoneModal(false);
      } else {
        setPhoneModalError(result.message ?? "Invalid code. Please try again.");
      }
    } catch {
      setPhoneModalError("Verification failed. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!userId || dbUser == undefined || dbUser == null) {
    return null;
  }

  if (showPhoneModal) {
    return (
      <CompleteProfileModal
        isOpen={true}
        isSending={isSendingOtp}
        isVerifying={isVerifyingOtp}
        otpSent={phoneOtpSent}
        errorMessage={phoneModalError}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        onBackToPhone={() => { setPhoneOtpSent(false); setPhoneModalError(null); }}
      />
    );
  }

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
      label: "Offers",
      href: "#",
      icon: (
        <IconWorldWww className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Statistics",
      href: "#",
      icon: (
        <IconChartBar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
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
      <div className="z-30 w-full !h-full flex flex-col lg:mr-1 lg:pb-1 overflow-hidden">
        <BalanceBar userId={userId} />
        {navItem === "Dashboard" && isAdmin && <DashboardMain />}
        {navItem === "USSD Dialer" && <USSD_DialerMain user={dbUser} />}
        {navItem === "Blacklist" && <BlacklistMain user={dbUser} />}
        {navItem === "Scheduler" && <SchedulerMain user={dbUser} />}
        {navItem === "Subscription" && <SubscriptionMain user={dbUser} />}
        {navItem === "Users" && isAdmin && <UsersMain />}
        {navItem === "Settings" && <SettingsMain user={dbUser} />}
        {navItem === "Store" && <StoreMain userId={userId} />}
        {navItem === "Transactions" && <TransactionsMain userId={userId} />}
        {navItem === "Offers" && <WebsiteMain userId={userId} />}
        {navItem === "Statistics" && <StatisticsMain userId={userId} />}
        {navItem === "Data Migration" && isAdmin && <ConvexMigration />}
      </div>
    </div>
  );
}
