// Mock Google Drive document representing meeting notes with action items
export interface GoogleDriveDocument {
  id: string;
  name: string;
  content: string;
  createdTime: string;
  modifiedTime: string;
  mimeType: string;
  webViewLink: string;
}

export interface ActionItem {
  assignee: string;
  task: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'bug' | 'feature' | 'story' | 'epic' | 'task';
  tags: string[];
}

export const mockMeetingNotesDocument: GoogleDriveDocument = {
  id: 'gdrive-doc-meeting-2025-01-25',
  name: 'Weekly Project Sync - January 25, 2025',
  createdTime: '2025-01-25T14:00:00Z',
  modifiedTime: '2025-01-25T15:30:00Z',
  mimeType: 'application/vnd.google-apps.document',
  webViewLink: 'https://docs.google.com/document/d/mock-document-id/edit',
  content: `
# Weekly Project Sync - January 25, 2025

## Meeting Details
- **Date:** January 25, 2025, 2:00 PM PST
- **Duration:** 1.5 hours
- **Location:** Zoom (hybrid meeting)

## Attendees
- Alice Johnson (Product Manager) - Present
- Bob Smith (Frontend Developer) - Present
- Carol Davis (Backend Developer) - Present  
- David Wilson (UI/UX Designer) - Present
- Eva Martinez (QA Engineer) - Remote

## Agenda Items Discussed

### 1. Sprint 3 Progress Review
- **Frontend Development:** Bob reported 85% completion of user dashboard components
- **Backend APIs:** Carol completed authentication endpoints, working on user management APIs
- **Design System:** David finalized the component library documentation
- **QA Testing:** Eva completed testing for Sprint 2 features, found 3 critical bugs

### 2. Critical Issues & Blockers
- **Authentication Bug:** Users cannot log out properly on mobile devices
- **Performance Issue:** Dashboard loading time exceeds 3 seconds on slower connections
- **Design Inconsistencies:** Navigation components need alignment with new brand guidelines

### 3. Sprint 4 Planning
- Focus on mobile responsiveness improvements
- Implement dark mode feature (requested by 73% of beta users)
- Optimize database queries for better performance
- Set up automated testing pipeline

## Action Items

### High Priority (Due: February 3, 2025)
- **[Bob Smith]** Fix logout functionality on mobile devices - Critical bug affecting user experience
- **[Carol Davis]** Optimize database queries for dashboard loading - Performance improvement needed
- **[Eva Martinez]** Create automated test suite for authentication flow - Set up CI/CD pipeline

### Medium Priority (Due: February 8, 2025)
- **[David Wilson]** Update navigation components to match new brand guidelines - Design consistency fix
- **[Alice Johnson]** Conduct user interviews for dark mode feature requirements - Research task
- **[Bob Smith]** Implement responsive design improvements for tablet view - UI enhancement

### Low Priority (Due: February 15, 2025)
- **[Carol Davis]** Research and implement caching strategy for API responses - Performance optimization
- **[David Wilson]** Create design mockups for upcoming settings page - Design preparation
- **[Eva Martinez]** Document testing procedures for new team members - Knowledge sharing

## Decisions Made
1. **Deadline Extension:** Project Alpha Phase 1 deadline moved from February 10 to February 15, 2025
2. **Technology Choice:** Approved use of Redis for caching layer implementation
3. **Team Addition:** Approved hiring one additional frontend developer for Q1
4. **Process Change:** Switch to daily standups instead of bi-weekly check-ins

## Next Steps
- Schedule individual 1:1s with each team member by February 1
- Set up Redis development environment by February 3
- Begin recruitment process for additional frontend developer
- Plan demo session for stakeholders on February 12

## Meeting Notes
- Team morale is high despite recent challenges
- Client feedback on current features has been very positive
- Need to improve cross-team communication for better coordination
- Consider implementing feature flags for safer deployments

---
*Meeting notes compiled by Alice Johnson*
*Next sync meeting: February 1, 2025, 2:00 PM PST*
  `.trim()
};

// Extracted action items from the meeting notes
export const extractedActionItems: ActionItem[] = [
  {
    assignee: 'Bob Smith',
    task: 'Fix logout functionality on mobile devices',
    dueDate: '2025-02-03T18:00:00Z',
    priority: 'urgent',
    type: 'bug',
    tags: ['mobile', 'authentication', 'critical']
  },
  {
    assignee: 'Carol Davis', 
    task: 'Optimize database queries for dashboard loading',
    dueDate: '2025-02-03T18:00:00Z',
    priority: 'high',
    type: 'task',
    tags: ['performance', 'backend', 'database']
  },
  {
    assignee: 'Eva Martinez',
    task: 'Create automated test suite for authentication flow',
    dueDate: '2025-02-03T18:00:00Z',
    priority: 'high', 
    type: 'task',
    tags: ['testing', 'automation', 'ci-cd']
  },
  {
    assignee: 'David Wilson',
    task: 'Update navigation components to match new brand guidelines',
    dueDate: '2025-02-08T18:00:00Z',
    priority: 'medium',
    type: 'story',
    tags: ['design', 'branding', 'ui']
  },
  {
    assignee: 'Alice Johnson',
    task: 'Conduct user interviews for dark mode feature requirements', 
    dueDate: '2025-02-08T18:00:00Z',
    priority: 'medium',
    type: 'story',
    tags: ['research', 'user-experience', 'requirements']
  },
  {
    assignee: 'Bob Smith',
    task: 'Implement responsive design improvements for tablet view',
    dueDate: '2025-02-08T18:00:00Z', 
    priority: 'medium',
    type: 'feature',
    tags: ['responsive', 'tablet', 'ui']
  },
  {
    assignee: 'Carol Davis',
    task: 'Research and implement caching strategy for API responses',
    dueDate: '2025-02-15T18:00:00Z',
    priority: 'low',
    type: 'task', 
    tags: ['performance', 'caching', 'api']
  },
  {
    assignee: 'David Wilson',
    task: 'Create design mockups for upcoming settings page',
    dueDate: '2025-02-15T18:00:00Z',
    priority: 'low',
    type: 'story',
    tags: ['design', 'mockups', 'settings']
  },
  {
    assignee: 'Eva Martinez',
    task: 'Document testing procedures for new team members',
    dueDate: '2025-02-15T18:00:00Z',
    priority: 'low',
    type: 'task',
    tags: ['documentation', 'onboarding', 'knowledge-sharing']
  }
];

// Mock Google Drive API responses
export const mockGoogleDriveResponses = {
  listFiles: {
    kind: 'drive#fileList',
    files: [
      {
        kind: 'drive#file',
        id: mockMeetingNotesDocument.id,
        name: mockMeetingNotesDocument.name,
        mimeType: mockMeetingNotesDocument.mimeType,
        createdTime: mockMeetingNotesDocument.createdTime,
        modifiedTime: mockMeetingNotesDocument.modifiedTime,
        webViewLink: mockMeetingNotesDocument.webViewLink
      }
    ]
  },
  
  getFile: mockMeetingNotesDocument,
  
  exportFile: mockMeetingNotesDocument.content
};

// Utility function to simulate AI parsing of meeting notes
export const parseActionItemsFromText = (_content: string): ActionItem[] => {
  // In a real implementation, this would use NLP/AI to extract action items
  // For the demo, we return the pre-extracted items
  return extractedActionItems;
};