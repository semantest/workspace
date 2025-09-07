**Purpose**: Task definition and execution management

---

@include shared/universal-constants.yml#Universal_Legend

## Command Execution
Execute: immediate. --plan→show plan first
Legend: Generated based on symbols used in command
Purpose: "[Mode][Task] management"

Enforce clear separation between task definition and execution phases.

@include shared/flag-inheritance.yml#Universal_Always

Examples:
- `/task --define "implement OAuth2 authentication"` - Define new task
- `/task --work TASK-001` - Work on existing task  
- `/task --list` - Show all tasks
- `/task --status TASK-001` - Check task progress

Task modes:

**--define:** Task definition mode
- Gather requirements and clarify scope
- Create detailed task specification
- Generate todo list without execution
- Output plan for user approval

**--work:** Task execution mode  
- Load existing task definition
- Execute todos systematically
- Track progress and update status
- Report completion and blockers

**--list:** View all tasks
- Show task ID, title, status
- Filter by status: defined, in_progress, completed, blocked

**--show:** Display task details
- Full task definition and scope
- Todo list with completion status
- Progress tracking and blockers

**--save:** Save defined task
- Persist task definition to .claude/tasks/
- Assign unique task ID
- Ready for execution with --work

**--delete:** Remove task
- Delete task file and history
- Requires confirmation

**--status:** Update task status
- Mark as: defined, in_progress, completed, blocked
- Add blocker descriptions

@include shared/task-mode-patterns.yml#Task_Mode_System

@include shared/task-mode-patterns.yml#mode_enforcement

@include shared/universal-constants.yml#Standard_Messages_Templates