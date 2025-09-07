**Purpose**: Milestone-based development with persona validation

---

@include shared/universal-constants.yml#Universal_Legend

## Command Execution
Execute: immediate. --plan’show plan first
Legend: Generated based on symbols used in command
Purpose: "[Manage][Roadmap] for milestone-driven development"

Create and manage development roadmaps with multi-persona validation.

@include shared/flag-inheritance.yml#Universal_Always

Examples:
- `/roadmap --create web-app` - Create roadmap from template
- `/roadmap --validate` - Validate all milestones against personas
- `/roadmap --status` - Show current progress
- `/roadmap --next` - Show next tasks
- `/roadmap [folder]` - Use custom roadmap folder

Roadmap operations:

**--create:** Initialize roadmap
- Select from templates: web-app, api-service, cli-tool
- Generate milestone files with structure
- Create initial task breakdowns
- Set up persona validation criteria

**--validate:** Multi-persona validation
- Check each milestone against all 9 personas
- Identify missing perspectives
- Suggest additional tasks for completeness
- Generate validation report

**--status:** Current progress
- Show completed/current/upcoming milestones
- Display task completion percentages
- List blocked items
- Show persona validation status

**--next:** Next actions
- Display upcoming tasks in current milestone
- Show recommended persona for each task
- Suggest optimal flag combinations
- Preview validation requirements

**--complete:** Mark milestone done
- Run final persona validations
- Update progress tracking
- Move to next milestone
- Update journal with completion

**folder:** Custom roadmap location
- Default: roadmap/
- Override with --roadmap path/to/roadmap/
- Configure in .env: SUPERCLAUDE_ROADMAP_FOLDER

Milestone structure:
- Title and overview
- Success criteria checklist
- Ordered task list with specifications
- Persona validation requirements

Task specifications include:
- Command to execute
- Recommended persona
- Thinking depth (think/think-hard/ultrathink)
- Required MCPs
- Expected outcomes

@include shared/roadmap-patterns.yml#Roadmap_System

@include shared/roadmap-patterns.yml#persona_requirements

@include shared/roadmap-patterns.yml#validation_process

@include shared/universal-constants.yml#Standard_Messages_Templates