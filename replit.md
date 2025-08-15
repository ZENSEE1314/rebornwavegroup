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
- **AUTOMATIC TOURNAMENT RESET**: ✅ ROBUST PERPETUAL TOURNAMENT CYCLE IMPLEMENTED
- **Enhanced Timer System**: Replaced unreliable long-duration setTimeout with interval-based expired tournament checker (every 5 minutes)
- **Auto-Restart Logic**: When tournament timer hits 0, system automatically distributes prizes to top 10 winners and starts new tournament
- **Prize Pool Reset**: Prize pool resets to 0 after distribution, ensuring clean slate for each tournament cycle
- **Tournament Stars Reset**: All users' tournament_stars reset to 0 for fair competition in next tournament
- **Continuous Operation**: Tournament system now runs perpetually without manual intervention with automatic transitions
- **Startup Recovery**: System checks for expired tournaments immediately on server restart to ensure no missed prize distributions
- **INDONESIA TIME ZONE SUPPORT**: ✅ WEEKLY MONDAY-TO-MONDAY TOURNAMENT SCHEDULE
- **Monday Start**: Tournaments now begin and end on Mondays at 00:00 Indonesia Time (WIB - UTC+7)
- **Timezone Accuracy**: All tournament scheduling follows Indonesia timezone for proper local time alignment
- **Weekly Cycles**: Tournament cycles run from Monday to Monday Indonesia time, providing consistent weekly competition periods
- **TOURNAMENT DISPLAY FIX**: ✅ USER LIST VISIBILITY AFTER RESET CORRECTED
- **Voting Access**: Tournament tab now shows all eligible users regardless of current tournament star count
- **Fresh Start Support**: Users with 0 tournament stars are visible for voting participation after tournament resets
- **Continuous Engagement**: Maintains user engagement by ensuring voting opportunities throughout tournament cycles
- **TOURNAMENT STAR CONTRIBUTIONS RESET**: ✅ COMPLETE FAIR TOURNAMENT RESET IMPLEMENTED
- **Given Stars Reset**: Tournament star contributions (stars given by users) now reset to 0 for fresh competition
- **Voter Tier Accuracy**: Voter tier rankings properly reset based on individual star giving only
- **Fair Competition**: Both tournament stars received AND tournament stars given reset for completely fair new tournaments

### Voter Tier Cumulative System Fix (August 15, 2025)
- **VOTER TIER PRESERVATION**: ✅ CRITICAL CUMULATIVE SYSTEM RESTORATION COMPLETED
- **Cumulative Progress**: Voter tier now correctly maintains cumulative progress and never decreases during tournament resets
- **Tournament Reset Fix**: Modified `resetTournamentStarContributions()` to only reset tournament-specific star giving while preserving total cumulative star contribution count
- **Tier Progression**: Voter tier (T1-T18) is now based on lifetime total stars given across all time periods, ensuring users can only progress upward
- **System Integrity**: Tournament resets only affect current tournament cycle participation, not overall voter tier achievement progress

### Enhanced Voting Interface (August 15, 2025)
- **PRESET VOTING AMOUNTS**: ✅ COMPREHENSIVE STAR AMOUNT SELECTION IMPLEMENTED
- **Expanded Options**: Updated vote dialog with 8 preset amounts: 1, 5, 10, 50, 100, 500, 1K, 5K stars
- **Two-Row Layout**: Organized small amounts (1-50) in first row, large amounts (100-5K) in second row  
- **Visual Enhancement**: Large amounts display as "1K", "5K" format for better readability
- **Custom Input**: Maintained custom amount input field for precise star spending
- **User Experience**: Streamlined voting process with quick preset selection for common amounts

### Username Display & Fantasy UI Enhancement (August 9, 2025)
- **USERNAME AUTHENTICATION FIX**: ✅ CRITICAL ENDPOINT UPDATE COMPLETED
- **Missing Field Resolution**: Added username field to /api/auth/user endpoint response in server/multiAuth.ts
- **Complete User Data**: Added referralCode, bankName, bankAccountNumber, accountHolderName fields for comprehensive user profile support
- **Account Settings**: Username now properly displays in profile Account Settings section
- **KOS Rankings**: Username correctly appears in Kings of Singers leaderboards instead of falling back to first/last names
- **FANTASY UI READABILITY**: ✅ SELECTIVE WHITE TEXT IMPLEMENTATION
- **Profile Section Headers**: Changed main profile title and description from dark slate to white text for better visibility on fantasy background
- **Section Descriptions**: Updated Purchase Verification, Referral Program, Collections, and Booking Management section descriptions to white text for enhanced readability
- **User Information Cards**: Maintained original slate colors (dark text) for user name, email, and phone within profile cards for optimal readability
- **Balanced Contrast**: Profile section headers and descriptions in white for fantasy theme visibility, while keeping user data readable in dark text on light card backgrounds
- **Visual Consistency**: Maintained Bronze loyalty tier exception (black text) while selectively applying white text to main section headers and descriptions
- **COMPLETED UI ENHANCEMENTS**: ✅ FINAL SELECTIVE WHITE TEXT IMPLEMENTATION COMPLETED
- **Booking Management Section**: Fixed title centering and description color - "Booking Management" title and "View and manage your service appointments" description now display in centered white text for optimal fantasy background visibility
- **Toy Collection Section**: Updated "My Toy Collection" description "View and manage your purchased toys" from gray to white text for enhanced readability on magical gradient background
- **All Sections Complete**: Successfully implemented white text styling for all section headers and descriptions while maintaining readable dark text for user personal data on light card backgrounds
- **Fantasy Theme Consistency**: Complete implementation of selective white text for optimal visibility on deep purple magical gradient background with animated shooting stars