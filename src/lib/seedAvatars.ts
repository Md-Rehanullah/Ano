import a1 from "@/assets/avatars/images_1.jpg.asset.json";
import a2 from "@/assets/avatars/images_2.jpg.asset.json";
import a3 from "@/assets/avatars/images_3.jpg.asset.json";
import a4 from "@/assets/avatars/images_4.jpg.asset.json";
import a5 from "@/assets/avatars/images_5.jpg.asset.json";
import a6 from "@/assets/avatars/images_6.jpg.asset.json";
import a7 from "@/assets/avatars/images_16.jpg.asset.json";
import a8 from "@/assets/avatars/images.jpg.asset.json";

const AVATARS = [a1.url, a2.url, a3.url, a4.url, a5.url, a6.url, a7.url, a8.url];

// Seed (dummy) accounts with male display names — avatars are only applied to these.
const MALE_SEED_NAMES = new Set(
  [
    "Aarav Mehta",
    "Aarav Sharma",
    "Aditya Kapoor",
    "Aditya Pillai",
    "Arjun Pillai",
    "Arjun Reddy",
    "Devansh Patel",
    "Devansh Sharma",
    "Kabir Malhotra",
    "Kabir Singh",
    "Karan Malhotra",
    "Nikhil Bose",
    "Nikhil Rao",
    "Rahul Verma",
    "Rohan Khanna",
    "Rohan Mehta",
    "Sahil Dutta",
    "Sahil Khan",
    "Vihaan Chatterjee",
    "Vikram Joshi",
    "Yash Agarwal",
  ].map((n) => n.toLowerCase())
);

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

/** Returns a stable avatar URL for male dummy/seed accounts, otherwise null. */
export const getSeedAvatar = (name?: string | null): string | null => {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (!MALE_SEED_NAMES.has(key)) return null;
  return AVATARS[hash(key) % AVATARS.length];
};
