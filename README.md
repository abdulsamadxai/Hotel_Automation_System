# Guest Auto Ops: Hotel Automation System

A comprehensive, frontend-only hotel property management system built with modern web technologies. Streamline hotel operations with automated workflows, real-time dashboards, and role-based access control.

## ✨ Features

### 🏨 Core Hotel Management
- **Room Management**: Track room status (available, occupied, dirty, maintenance), pricing, and amenities
- **Guest Profiles**: Maintain detailed guest information, preferences, stay history, and VIP status
- **Booking Engine**: Handle reservations, check-ins/outs, modifications, and cancellations
- **Housekeeping Automation**: Automatically generate cleaning tasks based on booking status changes
- **Staff Management**: Assign roles, track performance, and manage team schedules

### 💰 Financial Operations
- **Invoicing & Payments**: Generate invoices, track payment status, and manage folios
- **Expense Tracking**: Monitor operational costs by category and property
- **Revenue Analytics**: Real-time KPIs for daily, weekly, monthly, and yearly performance
- **Multi-currency Support**: Handle transactions in various currencies with automatic conversion

### 🤖 Intelligent Automation
- **Workflow Automation**: Trigger actions based on events (check-ins, check-outs, payments)
- **Custom Rules Engine**: Create property-specific automation without coding
- **Notifications System**: Automated alerts for staff and guests via email/internal messaging
- **Maintenance Tracking**: Schedule and track preventive maintenance and repairs

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Occupancy rates, revenue metrics, and operational KPIs
- **Activity Feed**: Audit trail of all system actions and user activities
- **Custom Reports**: Generate reports on bookings, revenue, expenses, and guest statistics
- **Performance Insights**: Identify trends and optimization opportunities

### 🔐 Security & Access Control
- **Role-Based Access Control (RBAC)**: Granular permissions for Super Admin, Owner, Manager, and Housekeeping roles
- **Multi-property Support**: Super Admin view for managing multiple hotels from one dashboard
- **Secure Authentication**: Email/password login with session management
- **Data Privacy**: Role-specific data visibility and access restrictions

## 🛠️ Technology Stack

### Frontend Framework
- **React 18** - Modern component-based UI library
- **TypeScript** - Static typing for enhanced developer experience and code reliability
- **Vite** - Lightning-fast build tool and development server

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Shadcn-ui** - Reusable, accessible component library built on Radix UI
- **Lucide Icons** - Beautiful, consistent icon set
- **Sonner** - Toast notification system
- **Recharts** - Data visualization library for charts and graphs

### State Management & Data
- **TanStack Query (React Query)** - Server state management, caching, and background updates
- **React Hook Form** - Performant form validation and management
- **Zod** - Schema validation for forms and API data
- **Date-fns** - Modern date manipulation library

### Routing & Navigation
- **React Router DOM v7** - Declarative routing for single-page applications
- **Protected Routes** - Role-based route protection

## 🏗️ Architecture

### Modular Design
```
src/
├── components/          # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard-specific widgets
│   ├── layout/          # Application layout components
│   └── ui/              # Shadcn-ui wrapped components
├── contexts/            # React context providers
├── hooks/               # Custom React hooks for data fetching
├── lib/                 # Utility functions and mock data
├── pages/               # Application pages/routes
└── styles/              # Global styles and themes
```

### Data Flow
1. **Mock Data Layer** - Frontend-only operation with realistic sample data
2. **Custom Hooks** - Encapsulate data fetching and state logic (`useRooms`, `useBookings`, etc.)
3. **React Query** - Handles caching, background updates, and stale data management
4. **Context API** - Global state for settings, authentication, and currency preferences
5. **Component Hierarchy** - Presentational components consume data from hooks/context

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd guest-auto-ops-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:5173` to view the application

### Demo Accounts
Use these test credentials to explore different role-based views:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | mrabdulsamad323@gmail.com | password123 |
| Hotel Owner | owner@hotel.com | password123 |
| Hotel Manager | manager@hotel.com | password123 |
| Housekeeping Staff | housekeeping@hotel.com | password123 |

## 🔧 Development

### Available Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm run test
```

### Code Standards
- **ESLint** - Code quality and style enforcement
- **TypeScript Strict Mode** - Type safety throughout the codebase
- **Prettier** - Code formatting (configured in IDE settings)
- **Component Composition** - Small, reusable components following RADIX UI patterns

## 📱 Responsive Design
The application is fully responsive and works across:
- Desktop computers (1920px+)
- Laptops and large tablets (1024px-1919px)
- Tablets and small laptops (768px-1023px)
- Mobile phones (320px-767px)

## 🎯 Use Cases

### Independent Hotel Owners
- Manage daily operations without complex PMS systems
- Automate routine tasks to focus on guest experience
- Gain insights into property performance with real-time analytics

### Hotel Management Companies
- Oversee multiple properties from a centralized dashboard
- Standardize operations across different locations
- Monitor financial performance and operational efficiency

### Hospitality Educators & Students
- Learn modern hotel management systems
- Practice with realistic data and scenarios
- Understand the technology behind hotel operations

## 🔄 Future Enhancements

Planned features for future releases:
- **Calendar View**: Visual booking management with drag-and-drop
- **Channel Manager**: Integration with OTAs (Booking.com, Expedia, etc.)
- **Point of Sale**: Restaurant and spa billing integration
- **Advanced Reporting**: Custom report builder with export options
- **Mobile App**: Native mobile applications for housekeeping and maintenance staff
- **API Layer**: Backend integration capabilities for real-world deployment
- **Multi-language Support**: Internationalization for global properties
- **Advanced Analytics**: Predictive occupancy forecasting and pricing recommendations

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

Built with modern web technologies:
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn-ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)

---

**Guest Auto Ops** - Modernizing hotel operations through intelligent automation and intuitive design.