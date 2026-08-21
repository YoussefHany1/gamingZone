"use client";

import React, { memo } from "react";
import { Lightbulb, AlertTriangle, MessageSquare } from "lucide-react";
import { useContactForm, MAX_MESSAGE_LENGTH } from "../hooks/useContactForm";
import { FeedbackType } from "../types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TypeButtonProps {
  value: FeedbackType;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: (value: FeedbackType) => void;
}

const TypeButton = memo<TypeButtonProps>(
  ({ value, icon, label, active, onPress }) => (
    <button
      type="button"
      onClick={() => onPress(value)}
      className={`flex flex-col items-center justify-center p-4 rounded-xl flex-1 border transition-all duration-300 gap-2 ${
        active
          ? "bg-secondary-blue border-primary/50 text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
          : "border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200"
      }`}
    >
      {icon}
      <span className={`text-xs font-bold ${active ? "text-white" : ""}`}>
        {label}
      </span>
    </button>
  ),
);
TypeButton.displayName = "TypeButton";

export function ContactForm() {
  const {
    t,
    type,
    setType,
    message,
    setMessage,
    loading,
    email,
    setEmail,
    handleSubmit,
  } = useContactForm();

  return (
    <div className="w-full flex flex-col text-white min-h-[calc(100vh-140px)]">
      <main className="grow max-w-3xl mx-auto w-full px-4 py-12 flex flex-col gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            {t("settings.menu.contactUs") || "Contact Us"}
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
            {t("settings.contact.typeLabel") || "How can we help you?"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-row justify-between gap-3 md:gap-4">
              <TypeButton
                value="suggestion"
                icon={<Lightbulb size={24} />}
                label={t("settings.contact.types.suggestion") || "Suggestion"}
                active={type === "suggestion"}
                onPress={setType}
              />
              <TypeButton
                value="problem"
                icon={<AlertTriangle size={24} />}
                label={t("settings.contact.types.problem") || "Problem"}
                active={type === "problem"}
                onPress={setType}
              />
              <TypeButton
                value="other"
                icon={<MessageSquare size={24} />}
                label={t("settings.contact.types.other") || "Other"}
                active={type === "other"}
                onPress={setType}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300">
                {t("settings.contact.messageLabel") || "Message"}
              </label>
              <div className="relative">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:border-light-blue/50 focus:outline-none focus:ring-1 focus:ring-light-blue/30 transition-all duration-300 scheme-dark resize-none h-40"
                  placeholder={
                    t("settings.contact.messagePlaceholder") ||
                    "Write your message here..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={loading}
                />
                <span
                  className={`absolute bottom-3 right-3 text-xs ${
                    message.length === MAX_MESSAGE_LENGTH
                      ? "text-red-400"
                      : "text-gray-500"
                  }`}
                >
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300">
                {t("settings.contact.emailLabel") || "Email"}
              </label>
              <Input
                type="email"
                className="text-left"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" isLoading={loading} className="mt-4 w-full">
              {t("settings.contact.send") || "Send"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
