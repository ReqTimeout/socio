export { default as Button } from "./components/Button.svelte";
export { default as Icon } from "./components/Icon.svelte";
export { default as Card } from "./components/Card.svelte";
export { default as StatusBadge } from "./components/StatusBadge.svelte";
export { default as BalancePill } from "./components/BalancePill.svelte";
export { default as MobileShell } from "./components/MobileShell.svelte";
export { default as Input } from "./components/Input.svelte";
export { default as Skeleton } from "./components/Skeleton.svelte";
export { default as Tabs } from "./components/Tabs.svelte";
export { default as Avatar } from "./components/Avatar.svelte";
export { default as Toast } from "./components/Toast.svelte";
export {
  toast,
  toasts,
  extractActionMsg,
  type ToastKind,
  type ToastItem,
} from "./toast.js";
export { default as Sheet } from "./components/Sheet.svelte";
export { default as ConfirmDialog } from "./components/ConfirmDialog.svelte";
export { default as SaldoHero } from "./components/SaldoHero.svelte";
export { default as QuickGrid } from "./components/QuickGrid.svelte";
export { default as ServiceCard } from "./components/ServiceCard.svelte";
export { default as BottomNav } from "./components/BottomNav.svelte";
export { default as Sidebar } from "./components/Sidebar.svelte";
export { default as Fab } from "./components/Fab.svelte";
export {
  default as ContextFab,
  type ContextFabAction,
} from "./components/ContextFab.svelte";
export {
  default as FilterDropdown,
  type FilterGroup,
  type FilterOption,
} from "./components/FilterDropdown.svelte";
export { default as CsvExportButton } from "./components/CsvExportButton.svelte";
export { default as QtyStepper } from "./components/QtyStepper.svelte";
export { default as EmptyState } from "./components/EmptyState.svelte";
export { default as AdminArt } from "./components/AdminArt.svelte";
export { default as AppFooter } from "./components/AppFooter.svelte";
export { default as Chart } from "./components/Chart.svelte";
export { default as Sparkline } from "./components/Sparkline.svelte";
export { default as StatCard } from "./components/StatCard.svelte";
export { default as DataTable } from "./components/DataTable.svelte";
export { default as Wordmark } from "./components/Wordmark.svelte";
export {
  default as PromoBanner,
  type Banner,
} from "./components/PromoBanner.svelte";
export {
  default as Select,
  type SelectOption,
} from "./components/Select.svelte";
export { default as NotifBell } from "./components/NotifBell.svelte";
export { default as AuthBackdrop } from "./components/AuthBackdrop.svelte";
export { default as NumberFlow } from "./components/NumberFlow.svelte";
export { default as OrbField } from "./components/OrbField.svelte";
export { default as Stat } from "./components/Stat.svelte";

// SVG art system (uiuxuser.md §2.4) — line-art 1.5px, ink + 1 aksen, motion-safe
export { default as EmptyOrdersArt } from "./art/EmptyOrders.svelte";
export { default as EmptyServicesArt } from "./art/EmptyServices.svelte";
export { default as EmptyTicketsArt } from "./art/EmptyTickets.svelte";
export { default as EmptyNotifArt } from "./art/EmptyNotif.svelte";
export { default as EmptyBalanceArt } from "./art/EmptyBalance.svelte";
export { default as EmptyAffiliateArt } from "./art/EmptyAffiliate.svelte";
export { default as SuccessOrderArt } from "./art/SuccessOrder.svelte";
export { default as SuccessTopupArt } from "./art/SuccessTopup.svelte";
export { default as SuccessArt } from "./art/SuccessArt.svelte";

export { haptic } from "./haptic.js";
export {
  staggerIn,
  revealDelay,
  tweenNumber,
  hoverLift,
} from "./lib/motion.js";
export type { StaggerInOpts, TweenNumberOpts } from "./lib/motion.js";
