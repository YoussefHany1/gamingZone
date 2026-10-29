export { default as ProfileForm } from "./components/ProfileForm";
export * from "./components/ProfileForm";
export { default as PublicProfileFields } from "./components/PublicProfileFields";
// `PublicProfileCard` is deliberately NOT re-exported here: it is a server
// component that imports `@/i18n/server` (`server-only`), and this barrel is
// pulled into the client graph by `/profile/page.tsx`. Import it directly from
// `./components/PublicProfileCard` in server components only.
export * from "./hooks/useProfile";
export { useProfileBootstrap } from "./hooks/useProfileBootstrap";
