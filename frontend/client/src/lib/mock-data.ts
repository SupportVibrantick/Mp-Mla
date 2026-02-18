export const MOCK_DATA = {
  user: {
    name: "Rajesh Kumar",
    role: "MLA",
    constituency: "South Bengaluru",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  stats: [
    { label: "Total Grievances", value: 1248, trend: "+12%", status: "neutral" },
    { label: "Resolved (Month)", value: 86, trend: "+5%", status: "success" },
    { label: "Active Projects", value: 14, trend: "3 Delayed", status: "warning" },
    { label: "Projects Completed", value: 42, trend: "This Year", status: "neutral" },
    { label: "Institutions", value: 156, trend: "Tracked", status: "neutral" },
    { label: "Avg Resolution", value: "4.2 Days", trend: "-0.5 Days", status: "success" },
  ],
  recentGrievances: [
    { id: "GRV-2024-001", citizen: "Amit Sharma", category: "Road", ward: "Ward 12", status: "Pending", priority: "High", date: "2024-02-15" },
    { id: "GRV-2024-002", citizen: "Priya Singh", category: "Water", ward: "Ward 08", status: "In Progress", priority: "Medium", date: "2024-02-14" },
    { id: "GRV-2024-003", citizen: "Rahul Verma", category: "Electricity", ward: "Ward 15", status: "Resolved", priority: "Low", date: "2024-02-12" },
    { id: "GRV-2024-004", citizen: "Sneha Gupta", category: "Sanitation", ward: "Ward 03", status: "Pending", priority: "High", date: "2024-02-10" },
    { id: "GRV-2024-005", citizen: "Vikram Malhotra", category: "Health", ward: "Ward 22", status: "In Progress", priority: "Critical", date: "2024-02-09" },
  ],
  projects: [
    { id: 1, name: "Road Resurfacing - MG Road", budget: "₹1.2 Cr", progress: 75, status: "Running", ward: "Ward 05" },
    { id: 2, name: "Community Hall Renovation", budget: "₹45 L", progress: 30, status: "Running", ward: "Ward 12" },
    { id: 3, name: "New Park Development", budget: "₹80 L", progress: 0, status: "Pending", ward: "Ward 18" },
    { id: 4, name: "Street Light Installation", budget: "₹25 L", progress: 100, status: "Completed", ward: "Ward 02" },
    { id: 5, name: "Drainage Repair", budget: "₹15 L", progress: 10, status: "On Hold", ward: "Ward 09" },
  ]
};
