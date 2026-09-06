import {
  Bell,
  Calendar,
  FileText,
  Globe,
  Search,
} from "lucide-react";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

const features = [
  {
    Icon: FileText,
    name: "Save your files",
    description: "We automatically save your documents, contracts, and payslips securely.",
    href: "/",
    cta: "Learn more",
    background: (
      <img
        src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80"
        alt="Documents & files"
        className="absolute -right-10 -top-10 w-72 h-48 object-cover rounded-lg opacity-25 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300"
      />
    ),
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: Search,
    name: "Full text search",
    description: "Instant enterprise search across employees, departments, and payroll runs.",
    href: "/",
    cta: "Explore search",
    background: (
      <img
        src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80"
        alt="Search workspace"
        className="absolute -right-10 -top-10 w-72 h-48 object-cover rounded-lg opacity-25 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300"
      />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: Globe,
    name: "Multilingual & Global",
    description: "Built-in localization, multi-currency salary structures, and compliance.",
    href: "/",
    cta: "View regions",
    background: (
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80"
        alt="Global collaboration"
        className="absolute -right-10 -top-10 w-72 h-48 object-cover rounded-lg opacity-25 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300"
      />
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: Calendar,
    name: "Smart Calendar & Shifts",
    description: "Manage working schedules, track shift lines, and automate time-off requests.",
    href: "/",
    cta: "Open calendar",
    background: (
      <img
        src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80"
        alt="Calendar and scheduling"
        className="absolute -right-10 -top-10 w-72 h-48 object-cover rounded-lg opacity-25 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300"
      />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: Bell,
    name: "Alerts & Notifications",
    description:
      "Get real-time alerts when payslips are computed, contracts expire, or leaves are submitted.",
    href: "/",
    cta: "View notifications",
    background: (
      <img
        src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80"
        alt="Notifications and alerts"
        className="absolute -right-10 -top-10 w-72 h-48 object-cover rounded-lg opacity-25 filter grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-300"
      />
    ),
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

function BentoDemo() {
  return (
    <BentoGrid className="lg:grid-rows-3">
      {features.map((feature) => (
        <BentoCard key={feature.name} {...feature} />
      ))}
    </BentoGrid>
  );
}

export { BentoDemo };
