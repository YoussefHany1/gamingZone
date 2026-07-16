"use client";

import React from "react";


import {
  ChatHeader,
  ChatEmptyState,
  ChatMessageList,
  ChatInput,
  useChat,
} from "@/features/chat";

export default function AIChatPage() {
  const {
    messages,
    input,
    setInput,
    loading,
    errorMsg,
    modelUsed,
    remaining,
    messagesEndRef,
    handleSendMessage,
    clearChat,
    user,
    lang,
    t,
  } = useChat();

  return (
    <div className="w-full flex flex-col text-white">
      

      <main className="grow max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-6 h-[calc(100vh-140px)]">
        <ChatHeader
          t={t}
          lang={lang}
          remaining={remaining}
          hasMessages={messages.length > 0}
          clearChat={clearChat}
        />

        {/* Conversation Box */}
        <div className="grow glass-panel border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden shadow-xl min-h-0 relative">
          {messages.length === 0 ? (
            <ChatEmptyState t={t} handleSendMessage={handleSendMessage} />
          ) : (
            <ChatMessageList
              messages={messages}
              loading={loading}
              errorMsg={errorMsg}
              t={t}
              modelUsed={modelUsed}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        {/* Input box */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          loading={loading}
          user={user}
          t={t}
        />
      </main>

      
    </div>
  );
}
