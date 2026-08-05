import { create } from 'zustand';

const useUIStore = create((set) => ({
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  isSearchOpen: false,
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  closeSearch: () => set({ isSearchOpen: false }),
  isChronologicalMode: false,
  toggleChronologicalMode: () => set((state) => ({ isChronologicalMode: !state.isChronologicalMode })),
  isPlayerOpen: false,
  setPlayerOpen: (isOpen) => set({ isPlayerOpen: isOpen }),
  isDonationOpen: false,
  openDonation: () => set({ isDonationOpen: true }),
  closeDonation: () => set({ isDonationOpen: false }),
  customContent: [],
  setCustomContent: (data) => set({ customContent: data }),
}));

export default useUIStore;
