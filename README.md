# CleanTrack - Property Management & Cleaning Services Platform

A comprehensive property management and cleaning services platform built with Next.js 13, TypeScript, and Tailwind CSS. CleanTrack provides a modern, responsive dashboard for managing properties, cleaning tasks, and team coordination.

## 🚀 Live Demo

**Frontend**: [CleanTrack Frontend](https://clean.track.thethemeai.com)  
**Backend API**: [CleanTrack API](https://clean.track.thethemeai.com/api)

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Features](#-core-features)
- [API Integration](#-api-integration)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [Progress & Roadmap](#-progress--roadmap)

## ✨ Features

### 🏠 Property Management
- **Create & Edit Properties**: Full CRUD operations for property management
- **Property Images**: Upload and manage property photos with base64 encoding
- **Amenities Management**: Add/remove property amenities
- **Address Management**: Complete address fields with validation
- **Owner Assignment**: Admin users can assign properties to specific owners

### 🏘️ Room Management
- **Room Creation**: Create custom room types with descriptions
- **Default Rooms**: Mark rooms as default for automatic property assignment
- **Room Tasks**: Associate cleaning tasks with specific rooms
- **Room Status**: Active/inactive room management

### 📋 Checklist System
- **Create Checklists**: Schedule cleaning tasks for properties
- **Task Assignment**: Assign housekeepers to specific properties
- **Progress Tracking**: Real-time progress monitoring with completion percentages
- **Photo Documentation**: Support for photo uploads during task completion
- **Review System**: Rating and review system for completed tasks

### 👥 User Management
- **Role-Based Access**: Three distinct user roles (Admin, Property Owner, Housekeeper)
- **User Creation**: Admin can create and manage user accounts
- **Status Management**: Activate/deactivate user accounts
- **Profile Management**: User profile updates and password changes

### 📊 Dashboard & Analytics
- **Role-Based Dashboard**: Different dashboards for each user role
- **Statistics**: Property counts, task completion rates, user activity
- **Recent Activity**: Real-time activity feed
- **Progress Tracking**: Visual progress indicators and completion rates

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context (AuthContext)
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives with custom styling

### Backend Integration
- **API**: RESTful API with custom service layer
- **Authentication**: JWT-based authentication
- **File Upload**: Base64 image encoding
- **Error Handling**: Comprehensive error handling and user feedback

### Development Tools
- **Package Manager**: npm/pnpm
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript strict mode
- **Build Tool**: Next.js built-in bundler

## 📁 Project Structure

```
cleanTrackFE/
├── app/                          # Next.js App Router pages
│   ├── checklists/              # Checklist management
│   ├── dashboard/               # Main dashboard
│   ├── login/                   # Authentication
│   ├── properties/              # Property management
│   ├── rooms/                   # Room management
│   ├── today-tasks/            # Housekeeper task view
│   ├── users/                   # User management
│   └── globals.css             # Global styles
├── components/                   # Reusable UI components
│   ├── layout/                  # Layout components
│   ├── properties/              # Property-specific components
│   ├── rooms/                   # Room-specific components
│   ├── ui/                      # Base UI components (shadcn/ui)
│   └── users/                   # User management components
├── contexts/                     # React Context providers
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── api.ts                   # API service layer
│   ├── auth.ts                  # Authentication utilities
│   └── utils.ts                 # General utilities
└── public/                       # Static assets
```

## 👥 User Roles & Permissions

### 🔐 Admin
- **Full System Access**: Manage all properties, users, and checklists
- **User Management**: Create, edit, and manage user accounts
- **Property Assignment**: Assign properties to specific owners
- **System Statistics**: View system-wide analytics and reports
- **Room Management**: Create and manage room types

### 🏠 Property Owner
- **Property Management**: Manage their own properties
- **Checklist Creation**: Create cleaning schedules for their properties
- **Housekeeper Assignment**: Assign housekeepers to properties
- **Task Review**: Review and rate completed cleaning tasks
- **Room Management**: Create custom rooms for their properties

### 🧹 Housekeeper
- **Task Execution**: View and complete assigned cleaning tasks
- **Photo Documentation**: Upload photos for task completion
- **Progress Tracking**: Track task completion progress
- **Today's Tasks**: View daily task assignments

## 🎯 Core Features

### Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Route protection based on user roles
- **Automatic Token Refresh**: Seamless session management
- **Protected Routes**: Component-level access control

### Property Management
- **CRUD Operations**: Full create, read, update, delete functionality
- **Image Upload**: Base64 image encoding for property photos
- **Amenities System**: Dynamic amenity management
- **Owner Assignment**: Admin can assign properties to specific owners
- **Room Assignment**: Associate rooms with properties

### Room Management
- **Default Room System**: Mark rooms as default for automatic selection
- **Task Association**: Link cleaning tasks to specific rooms
- **Room Types**: Custom room categorization
- **Status Management**: Active/inactive room states

### Checklist System
- **Scheduling**: Create cleaning schedules with specific dates
- **Task Assignment**: Assign housekeepers to properties
- **Progress Tracking**: Real-time completion tracking
- **Photo Documentation**: Support for photo uploads
- **Review System**: Rating and feedback for completed tasks

### User Management
- **Role Assignment**: Assign users to specific roles
- **Status Control**: Activate/deactivate user accounts
- **Profile Management**: User profile updates
- **Password Management**: Secure password changes

## 🔌 API Integration

### Service Layer
- **Centralized API Service**: `lib/api.ts` handles all API communication
- **Error Handling**: Comprehensive error handling and user feedback
- **Request/Response Interceptors**: Automatic token management
- **File Upload**: Base64 encoding for image uploads

### Endpoints
- **Authentication**: Login, register, logout, password reset
- **Properties**: CRUD operations with image upload
- **Rooms**: Room management with default room system
- **Checklists**: Task scheduling and progress tracking
- **Users**: User management and role assignment
- **Dashboard**: Statistics and analytics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cleanTrackFE
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API URL:
   ```
   NEXT_PUBLIC_API_URL=https://clean.track.thethemeai.com/api
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Structure
- **Components**: Reusable UI components in `/components`
- **Pages**: Next.js App Router pages in `/app`
- **API**: Service layer in `/lib/api.ts`
- **Context**: State management in `/contexts`
- **Hooks**: Custom React hooks in `/hooks`

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library
- **Custom Components**: Tailored components for specific features

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API endpoint
- `NEXTAUTH_SECRET`: Authentication secret (if using NextAuth)

### Deployment Platforms
- **Vercel**: Recommended for Next.js applications
- **Netlify**: Alternative deployment option
- **Docker**: Containerized deployment

## 📈 Progress & Roadmap

### ✅ Completed Features

#### Authentication & Authorization
- [x] JWT-based authentication system
- [x] Role-based access control
- [x] Protected routes and components
- [x] User session management

#### Property Management
- [x] Property CRUD operations
- [x] Image upload with base64 encoding
- [x] Amenities management
- [x] Owner assignment for admin users
- [x] Room assignment system

#### Room Management
- [x] Room CRUD operations
- [x] Default room system
- [x] Room status management
- [x] Task association

#### User Management
- [x] User CRUD operations
- [x] Role assignment
- [x] Status management
- [x] Profile updates

#### Dashboard & Analytics
- [x] Role-based dashboards
- [x] Statistics and metrics
- [x] Recent activity feed
- [x] Progress tracking

#### Checklist System
- [x] Checklist creation and management
- [x] Task assignment
- [x] Progress tracking
- [x] Photo documentation
- [x] Review and rating system

### 🔄 In Progress

#### Enhanced Features
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] Export functionality
- [ ] Mobile app development

#### Performance Optimizations
- [ ] Image optimization
- [ ] Code splitting
- [ ] Caching strategies
- [ ] Performance monitoring

### 🚧 Planned Features

#### Advanced Analytics
- [ ] Detailed reporting system
- [ ] Performance metrics
- [ ] Custom dashboards
- [ ] Data visualization

#### Communication Features
- [ ] In-app messaging
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Push notifications

#### Integration Features
- [ ] Third-party integrations
- [ ] API webhooks
- [ ] External service connections
- [ ] Payment processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Email**: support@cleantrack.com
- **Documentation**: [CleanTrack Docs](https://docs.cleantrack.com)
- **Issues**: [GitHub Issues](https://github.com/cleantrack/issues)

---

**CleanTrack** - Professional property management and cleaning services platform built with modern web technologies.
