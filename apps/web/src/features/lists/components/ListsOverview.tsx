import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/Link";


import {
  List,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
  Bookmark,
  X,
  Gamepad2,
} from "lucide-react";
import { useLists } from "../hooks/useLists";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ListsOverview() {
  const router = useRouter();
  const {
    t,
    user,
    isLoading,
    lists,
    loading,
    modalOpen,
    setModalOpen,
    newListName,
    setNewListName,
    isCreating,
    deleteConfirm,
    setDeleteConfirm,
    getDisplayName,
    handleCreateList,
    handleDeleteList,
  } = useLists();

  useEffect(() => {
    if (!isLoading && (!user || user.isAnonymous)) {
      router.push("/auth/login");
    }
  }, [isLoading, router, user]);

  if (isLoading || !user || user.isAnonymous) {
    return (
      <>
        
        <main className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </>
    );
  }

  return (
    <>
      
      <main className="min-h-screen py-10 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bookmark className="w-8 h-8 text-light-blue" />
              {t("navigation.titles.myLists")}
            </h1>
            <Button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-xl shadow-lg shadow-light-blue/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("userLists.actions.createNewList")}
            </Button>
          </div>

          {/* Lists */}
          {loading ? (
            <LoadingSpinner />
          ) : lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <Bookmark className="w-20 h-20 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-400">
                {t("userLists.empty.title")}
              </h2>
              <p className="text-gray-500 text-sm">
                {t("userLists.empty.playedSub")}
              </p>
              <Link
                href="/games"
                className="px-6 py-3 rounded-xl bg-linear-to-r from-secondary-blue to-light-blue font-semibold shadow-lg hover:opacity-90 transition-all"
              >
                {t("userLists.empty.findButton")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => (
                <div key={list.id} className="relative group">
                  <Link href={`/lists/${list.id}?name=${encodeURIComponent(list.name)}`}>
                    <Card
                      hoverEffect
                      className="flex items-center justify-between p-5 group-hover:shadow-lg group-hover:shadow-light-blue/5"
                    >
                      <div className="flex items-center gap-4">
                        {list.type === "default" ? (
                          <div className="w-10 h-10 rounded-xl bg-light-blue/10 border border-light-blue/20 flex items-center justify-center">
                            <List className="w-5 h-5 text-light-blue" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-secondary-blue/10 border border-secondary-blue/20 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-secondary-blue" />
                          </div>
                        )}
                        <span className="text-base font-semibold">
                          {getDisplayName(list.name)}
                        </span>
                      </div>
                      <Gamepad2 className="w-5 h-5 text-gray-600 group-hover:text-light-blue transition-colors" />
                    </Card>
                  </Link>

                  {/* Delete button for custom lists */}
                  {list.type === "custom" && (
                    <>
                      {deleteConfirm === list.id ? (
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-in fade-in slide-in-from-right duration-200">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors"
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteConfirm(list.id);
                          }}
                          className="absolute right-16 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create List Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <Card
            className="w-full max-w-sm mx-4 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {t("userLists.actions.createNewList")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <Input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t("userLists.placeholders.newListName")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-gray-300"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={isCreating || !newListName.trim()}
                isLoading={isCreating}
                className="flex-1 py-2.5 rounded-xl"
              >
                {t("common.create")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      
    </>
  );
}
