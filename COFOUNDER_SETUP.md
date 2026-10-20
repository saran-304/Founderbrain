# FounderBrain Co-Founder Profile Setup

## Co-Founder Information

### Saran S U
- **Role:** Co-Founder of FounderBrain
- **Email:** founderbrainofficial@gmail.com
- **Skills:** AI Engineering, Python Development, Web Development
- **Headline:** AI Engineer | Python Developer | Web Developer
- **Interests:** Artificial intelligence, Python applications, web development, AI-powered products, and startup building

### Sri Ranjan S
- **Role:** Co-Founder of FounderBrain
- **Email:** founderbrainofficial@gmail.com  
- **Skills:** Cybersecurity Engineering, Network Security, Ethical Hacking
- **Headline:** Cybersecurity Engineer | Network Security | Ethical Hacking Specialist
- **Interests:** Cybersecurity, network defense, security engineering, ethical hacking, and secure application development

## Setup Instructions

### Step 1: Apply Database Migrations

Ensure all migrations have been applied to your Supabase project at https://app.supabase.com

Navigate to SQL Editor and run the migrations in order:
1. `20261016000000_founderbrain_core.sql`
2. `20261016001000_founderbrain_growth.sql`
3. `20261017000000_founderbrain_member_update_privileges.sql`
4. `20261017000100_founderbrain_public_portfolios.sql`

### Step 2: Register Both Co-Founder Accounts

1. **For Saran S U:**
   - Go to http://localhost:3000/signup
   - Register with email: `founderbrainofficial@gmail.com` (or a unique email)
   - Display name: `Saran S U`
   - Complete email verification if required

2. **For Sri Ranjan S:**
   - Go to http://localhost:3000/signup
   - Register with a different email (Supabase requires unique emails per account)
   - Display name: `Sri Ranjan S`
   - Complete email verification if required

### Step 3: Complete Profiles

**For Saran S U:**
1. Navigate to http://localhost:3000/portfolio
2. Click on profile editing (or go to Settings if profile edit is there)
3. Set the following:
   - **Display Name:** Saran S U
   - **Headline:** AI Engineer | Python Developer | Web Developer
   - **Bio:** Co-Founder of FounderBrain. Passionate about artificial intelligence, Python applications, web development, AI-powered products, and startup building.
   - **Skills:** Add `AI Engineering`, `Python Development`, `Web Development`
   - **Company:** FounderBrain
   - **Is Discoverable:** ✓ Yes
   - **Portfolio Is Public:** ✓ Yes (optional)

**For Sri Ranjan S:**
1. Navigate to http://localhost:3000/portfolio
2. Complete profile with:
   - **Display Name:** Sri Ranjan S
   - **Headline:** Cybersecurity Engineer | Network Security | Ethical Hacking Specialist
   - **Bio:** Co-Founder of FounderBrain. Focused on cybersecurity, network defense, security engineering, ethical hacking, and secure application development.
   - **Skills:** Add `Cybersecurity Engineering`, `Network Security`, `Ethical Hacking`
   - **Company:** FounderBrain
   - **Is Discoverable:** ✓ Yes
   - **Portfolio Is Public:** ✓ Yes (optional)

### Step 4: Connect the Co-Founders

1. From Saran's account, go to `/founders`
2. Search for "Sri Ranjan" and send a connection request
3. From Sri Ranjan's account, accept the connection request

## Important Notes

- **Email Limitation:** Supabase Auth requires unique email addresses per account. You cannot use the same email for both accounts.
- **Workaround:** Use email aliases (e.g., `founderbrainofficial+saran@gmail.com` and `founderbrainofficial+sriranjan@gmail.com` if Gmail) or separate emails.
- **Display Information:** The system will show both as Co-Founders of FounderBrain based on the profile data, not the login email.
- **Contact Email:** The official contact email `founderbrainofficial@gmail.com` should be displayed on an About or Contact page (see next section).

## About Page Implementation

An About page will be created at `/about` showing:
- Both co-founders with equal prominence
- Official contact email: founderbrainofficial@gmail.com (clickable mailto link)
- No phone numbers
- Equal roles and presentation
