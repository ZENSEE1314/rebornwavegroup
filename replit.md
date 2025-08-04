# Reborn Wave Group - Digital Pet Care Application

## Overview
A comprehensive digital financial management and collectible toy platform combining interactive gamification, multi-language support, and dynamic user engagement. The project's vision is to offer a unique blend of digital pet care with an 18-tier influencer system, star trading, and tournament competitions within a singing competition platform (Kings Of Singers - KOS). Key capabilities include real-time pet lifecycle management, a token reward system, a marketplace for toy trading, and robust financial management tools. The ambition is to provide an immersive and engaging user experience, leveraging advanced UI/UX design and real-time data updates.

## User Preferences
- Focus on systematic, comprehensive implementation
- Prioritize multi-language functionality for global reach
- Maintain professional, technical communication style
- Document all architectural changes with clear rationale

## System Architecture

### Core Technologies
- **Frontend**: React (TypeScript) with gamified, interactive UI components
- **Backend**: Node.js with comprehensive validation systems
- **Database**: PostgreSQL for secure financial and collectible toy data management
- **Authentication**: Email/password system with comprehensive password reset functionality
- **Real-time Updates**: WebSocket implementation for instant data synchronization
- **Internationalization**: Multi-language support (English, Chinese, Indonesian)

### UI/UX Decisions
- **Modern App-Based Design**: Redesigned navigation system with gradient backgrounds, enhanced mobile-first design, and app-like user experience.
- **Fantasy Theme**: Immersive fantasy background with deep purple magical gradient, animated shooting stars, twinkling star fields, and magic sparkles.
- **Color Schemes**: Consistent use of purple gradients for admin dashboards and navigation, blue/pink for gender identification, and color-coded navigation tabs (blue, pink, purple, yellow, emerald).
- **Responsive Design**: Optimized layouts for both mobile and desktop, including a 3-row mobile stats layout and dynamic role-based dashboard customization.
- **Visual Feedback**: Interactive elements with scale animations, glow effects, and visual indicators for active states.
- **Accessibility**: Enhanced readability with targeted white text headers and proper contrast ratios.

### Technical Implementations
- **Digital Pet Care**: 6-stage evolution system (Baby → Teenager → Adult → Grandpa → Death → Reborn) with real-time stat tracking and female cute voice feedback. Sleep energy increases every 5 minutes.
- **Token System**: Token reward system with daily rewards, comprehensive transaction tracking, and admin management.
- **Marketplace Functionality**: Toy trading marketplace with seasonal pricing, individual and user listings, and real-time updates.
- **Referral System**: Simplified single-level referral commission system (10% for direct referrals only).
- **Admin Dashboard**: Comprehensive management tools with real-time data updates for users, payments, appointments, toys, and content. Features include user management, payment verification, and reward management (banners, rewards).
- **KOS (Kings of Singers) Platform**: Transformed into a singing competition with star trading, tournaments, and an 18-tier influencer system. Features include:
    - **Star System**: Individual stars (immediate use) and tournament stars (accumulate in prize pool).
    - **Like vs. Vote**: Separate "like" (social engagement) and "vote" (currency) mechanisms.
    - **Leaderboards**: Accurate star-based rankings for tournaments and individual modes.
    - **Tournament System**: 7-day tournaments with automatic prize distribution to top 10 users, real-time prize pool updates, and inline search.
    - **Profile Photos**: User profile photo upload system.
    - **Top Supporters**: Display of top 3 supporters with individual star amounts.
- **Payment System**: Dual payment system (Credit and Cash) for purchase verification. Stripe integration for credit top-ups in IDR currency.
- **Security**: Password change functionality with bcrypt verification. Comprehensive error handling and WebSocket error suppression for development.
- **Communication System**: SendGrid email integration with bulk messaging capability.
- **Pet Activation**: Two-step pet activation system (QR code collection then manual activation).
- **Onboarding**: Interactive onboarding walkthrough with a virtual pet guide.

## External Dependencies
- **Stripe**: For credit top-up payments and payment intent management.
- **SendGrid**: For email communication, including welcome emails and bulk messaging.
- **Twilio**: (In progress) For WhatsApp communication.
- **PostgreSQL**: The relational database used for all data storage.

### KOS User List UI Overhaul & Tournament Voting Fix (August 4, 2025)
- **KOS USER LIST VISUAL REDESIGN**: ✅ MAJOR UI IMPROVEMENTS COMPLETED
- **Text Removal**: Removed voter and individual tier descriptive text, now showing only T/R tier logos for cleaner visual presentation
- **Ranking Display**: Changed ranking numbers to small ordinal format (1st, 2nd, 3rd, etc.) positioned on top-left corner of cards
- **Profile Photos**: Increased profile photo sizes from w-12 h-12/w-16 h-16 to w-16 h-16/w-20 h-20 for better visual prominence
- **Layout Enhancement**: Implemented relative positioning with absolute rank badges for improved visual hierarchy
- **CRITICAL BUG FIX**: ✅ TOURNAMENT VOTING SYSTEM CORRECTED 
- **Tournament Mode Fix**: Fixed tournament voting to only add stars to prize pool (tournamentStars) without increasing user's total star count
- **Voting Logic**: Removed incorrect totalStars increment in tournament mode - votes now properly go only to tournament prize pool
- **System Integrity**: Tournament and individual modes now function as intended - tournament votes accumulate for 7-day prize distribution, individual votes award immediately
- **AUTOMATIC TOURNAMENT RESET**: ✅ PERPETUAL TOURNAMENT CYCLE IMPLEMENTED
- **Auto-Restart Logic**: When tournament timer hits 0, system automatically distributes prizes to top 10 winners and starts new 7-day tournament
- **Prize Pool Reset**: Prize pool resets to 0 after distribution, ensuring clean slate for each tournament cycle
- **Continuous Operation**: Tournament system now runs perpetually without manual intervention - 7-day cycles with automatic transitions