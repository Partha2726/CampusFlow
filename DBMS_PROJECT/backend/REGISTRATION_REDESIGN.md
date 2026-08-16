# Registration Workflow Redesign

## Goal

Transform the registration module from a CRUD-oriented interface into a workflow-driven registration experience.

The current implementation exposes multiple independent actions that require users to understand internal database concepts before completing a registration.

The redesigned workflow should guide users through a single registration process while preserving the existing database schema, API routes, and backend logic.

---

# Design Principles

The registration module should be built around the user's intent:

> "I want to register participants for an event."

rather than:

> "I want to create teams and manipulate records."

The interface should:

- Reduce cognitive load
- Eliminate unnecessary decisions
- Guide users step-by-step
- Improve discoverability
- Improve administrative efficiency
- Reuse all existing backend functionality

---

# Constraints

## Must Not Change

- Database schema
- Existing tables
- Existing relationships
- Existing API endpoints
- Registration business rules

## Must Reuse

- Current registration APIs
- Current team APIs
- Current student APIs
- Current event APIs

All improvements should be implemented at the UI and workflow layer.

---

# Existing Problems

## Problem 1: Too Many Primary Actions

Current page exposes:

- Create Team
- Edit Team
- Register Team Group
- New Individual Registration

Users are immediately forced to choose between multiple actions without understanding the correct workflow.

---

## Problem 2: Database-Oriented Design

Current UI reflects how data is stored.

Users are asked to think about:

- Teams
- Registrations
- Team Groups

before they have even selected an event or participant.

The interface should reflect user goals, not database structure.

---

## Problem 3: Team Creation Is Treated As The Goal

Creating a team is not the primary objective.

The real objective is:

> Registering a team for an event.

Team creation should exist only as part of the registration process.

---

## Problem 4: Editing Receives Too Much Importance

The Edit Team action is displayed as a primary action.

Editing is a maintenance task and should not compete visually with registration actions.

---

# New Registration Experience

## Remove Existing Header Actions

Remove:

```text
Create Team
Edit Team
Register Team Group
New Individual Registration
```

---

## Replace With Single Primary Action

```text
+ New Registration
```

This becomes the only primary action displayed at the top of the page.

Visual hierarchy should clearly communicate that registration is the primary workflow.

---

# Registration Wizard

Clicking:

```text
+ New Registration
```

opens a multi-step modal wizard.

## Modal Specifications

Width:

```text
700px – 900px
```

Behavior:

- Center aligned
- Scrollable if necessary
- Responsive for smaller screens
- Keyboard accessible
- Escape closes modal

---

# Step 1 — Registration Type

## Title

```text
Choose Registration Type
```

---

## Options

### Individual Registration

```text
( ) Individual Registration
```

Description:

```text
Register a single student for an event.
```

---

### Team Registration

```text
( ) Team Registration
```

Description:

```text
Register a team of students for a team-based event.
```

---

## Continue Button

Requirements:

- Disabled until selection is made
- Becomes active once a type is selected

---

# Individual Registration Workflow

## Step 2 — Registration Details

### Student

Component:

Searchable dropdown

Search by:

- Student Name
- Roll Number

Display:

```text
Partha Kumar
24BDS1044
```

---

### Event

Component:

Searchable dropdown

Display:

```text
Hackathon 2026
Technical Event
```

---

### Status

Dropdown

Use existing backend values only.

Example:

```text
Registered
Confirmed
Pending
```

---

## Validation Rules

Required:

- Student
- Event

Prevent submission if missing.

Use:

- Inline validation messages
- Highlight invalid fields

Do not use browser alerts.

---

# Step 3 — Confirmation

Display summary:

```text
Student:
Partha Kumar

Event:
Hackathon 2026

Status:
Registered
```

---

## Action

Primary Button:

```text
Register Student
```

---

## Success State

Display:

```text
Registration created successfully
```

Then:

- Close modal
- Refresh registrations table
- Refresh statistics cards

---

# Team Registration Workflow

## Step 2 — Team Registration Mode

Title:

```text
Team Registration
```

Options:

```text
( ) Create New Team

( ) Use Existing Team
```

Only one option may be selected.

---

# Create New Team Flow

## Step 3 — Team Creation

### Team Name

Required

Validation:

- Minimum 3 characters
- Maximum existing backend limits

---

### Event

Searchable dropdown.

Display:

```text
Robotics Expo
Technical Event
```

Only events supporting team registrations should appear.

Use existing registration type information if available.

---

### Team Members

Multi-select searchable control.

Search by:

- Student Name
- Roll Number

Selected members appear as removable chips.

Example:

```text
[ Rahul Sharma × ]
[ Neha Iyer × ]
[ Sneha Nair × ]
```

---

## Team Summary Screen

Display:

```text
Team Name
Event
Member Count
Member List
```

---

## Primary Action

```text
Create Team & Register
```

This action should:

1. Create team
2. Register team
3. Refresh registrations table

using existing APIs.

---

# Existing Team Flow

## Step 3 — Select Team

Title:

```text
Select Existing Team
```

---

### Team Selector

Searchable dropdown.

Display:

```text
Robotics Squad
4 Members
```

Example:

```text
Robotics Squad (4 Members)
```

---

### Event Selector

Searchable dropdown.

Display:

```text
Robotics Expo
```

---

# Step 4 — Confirmation

Display:

```text
Team:
Robotics Squad

Members:
4

Event:
Robotics Expo
```

---

## Primary Action

```text
Register Team
```

---

## Success State

Display:

```text
Team registration completed successfully
```

Then:

- Close modal
- Refresh page data
- Update registration metrics

---

# Team Management Redesign

## Remove Primary Team Actions

Remove:

```text
Edit Team
```

from page header.

---

# New Team Management Location

Team editing should only be available when viewing a specific team.

Example:

Registration Row:

```text
View Team
```

---

## Team Details Modal

Display:

### Team Information

- Team Name
- Event
- Members
- Registration Count

---

## Secondary Actions

```text
Edit Team
```

```text
Remove Member
```

```text
Add Member
```

These are maintenance actions and should not appear as primary page-level controls.

---

# Registrations Page Layout

## Header

### Left Side

Page Title:

```text
Registrations
```

Subtitle:

```text
Manage student and team registrations
```

---

### Right Side

Primary Action:

```text
+ New Registration
```

No other primary buttons should appear.

---

# Registration Analytics Cards

Add a statistics row above the registrations table.

---

## Card 1

### Total Registrations

Display:

```text
Total Registrations
```

Value:

```text
All registrations
```

---

## Card 2

### Individual Registrations

Display:

```text
Individual Registrations
```

Value:

```text
Count of individual registrations
```

---

## Card 3

### Team Registrations

Display:

```text
Team Registrations
```

Value:

```text
Count of team registrations
```

---

## Card 4

### Confirmed Registrations

Display:

```text
Confirmed Registrations
```

Value:

```text
Count of confirmed registrations
```

---

# Registration Table Improvements

## Visual Improvements

Increase readability through:

- Better spacing
- Consistent row height
- Improved typography
- Hover states
- Sticky table header

---

## Status Badges

Replace plain text status values with colored badges.

### Registered

Green

```text
REGISTERED
```

---

### Confirmed

Blue

```text
CONFIRMED
```

---

### Pending

Amber

```text
PENDING
```

---

### Cancelled

Red

```text
CANCELLED
```

---

Status styling should be consistent across:

- Dashboard
- Registrations
- Payments
- Events

---

# Search Improvements

Current search behavior is limited.

Expand search functionality to include:

- Student Name
- Roll Number
- Event Name
- Team Name
- Registration ID

Client-side filtering is acceptable.

No backend modifications required.

---

# Filtering

Add optional filters above the table.

## Registration Type

```text
All
Individual
Team
```

---

## Status

```text
All
Registered
Confirmed
Pending
Cancelled
```

---

## Event

Dropdown populated from existing events.

---

# Empty State

When no registrations exist:

Display illustration or icon.

---

## Message

```text
No registrations found
```

---

## Supporting Text

```text
Create your first registration to get started.
```

---

## Primary Action

```text
+ New Registration
```

---

# Loading States

All registration actions should provide visual feedback.

Examples:

```text
Loading registrations...
```

```text
Creating team...
```

```text
Registering participant...
```

Disable submit buttons while requests are in progress.

Prevent duplicate submissions.

---

# Error Handling

Display friendly inline errors.

Examples:

```text
Unable to create registration.
Please try again.
```

```text
Selected student is already registered.
```

```text
Unable to load event data.
```

Avoid browser alert dialogs.

---

# Mobile Responsiveness

Support:

- Tablet screens
- Laptop screens
- Desktop screens

Requirements:

- Responsive modal sizing
- Horizontal table scrolling
- Proper card stacking
- Accessible touch targets

---

# Success Criteria

The redesigned registration module should allow an administrator to:

1. Click "New Registration"

2. Select Individual or Team

3. Complete registration through a guided workflow

4. Automatically return to the updated registrations list

without needing to understand:

- Team creation mechanics
- Database relationships
- Internal registration structures

The experience should feel like a modern event registration workflow rather than a collection of disconnected CRUD operations.