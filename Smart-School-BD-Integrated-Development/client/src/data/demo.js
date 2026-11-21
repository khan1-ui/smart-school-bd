export const demoSummary = [
  { label: "নিবন্ধিত স্কুল", value: "—", helper: "API সংযুক্ত হলে দেখাবে", tone: "green", icon: "school" },
  { label: "হাজিরা শুরু করেছে", value: "—", helper: "আজকের সেশন", tone: "blue", icon: "play" },
  { label: "চূড়ান্ত করেছে", value: "—", helper: "শুধু finalized", tone: "purple", icon: "check" },
  { label: "যাচাই প্রয়োজন", value: "—", helper: "সতর্কতা ও stale তথ্য", tone: "amber", icon: "alert" },
];

export const demoSchools = [
  { code: "SSD-DEMO-01", name: "স্মার্ট স্কুল ডেমো", area: "জামালপুর সদর, জামালপুর", type: "বেসরকারি", status: "চলমান", updated: "ডেমো সময়", present: "—", rate: "—", },
  { code: "SSD-DEMO-02", name: "নমুনা সরকারি বিদ্যালয়", area: "মেলান্দহ, জামালপুর", type: "সরকারি", status: "চূড়ান্ত", updated: "ডেমো সময়", present: "—", rate: "—", },
  { code: "SSD-DEMO-03", name: "নমুনা বিদ্যালয় ৩", area: "ইসলামপুর, জামালপুর", type: "সরকারি", status: "তথ্য পুরোনো", updated: "ডেমো সময়", present: "—", rate: "—", },
  { code: "SSD-DEMO-04", name: "নমুনা বিদ্যালয় ৪", area: "দেওয়ানগঞ্জ, জামালপুর", type: "বেসরকারি", status: "শুরু হয়নি", updated: "কোনো সাম্প্রতিক তথ্য নেই", present: "—", rate: "—", },
];

export const demoAttendance = [
  { className: "ষষ্ঠ", section: "ক", total: 36, present: 32, absent: 3, late: 1, status: "চূড়ান্ত" },
  { className: "সপ্তম", section: "ক", total: 34, present: 30, absent: 3, late: 1, status: "চলমান" },
  { className: "অষ্টম", section: "খ", total: 31, present: 27, absent: 4, late: 0, status: "জমা হয়েছে" },
];

export const demoAlerts = [
  { title: "স্কুলের তথ্য পুরোনো", detail: "নমুনা বিদ্যালয় ৩ — সংযোগের অবস্থা যাচাই প্রয়োজন", severity: "warning" },
  { title: "হাজিরা এখনো শুরু হয়নি", detail: "নমুনা বিদ্যালয় ৪ — এটি নিশ্চিত অনুপস্থিতির প্রমাণ নয়", severity: "neutral" },
];