# Course Planner Plus

> Visualizer for all SJSU major course requirements.

## Team

| Name | GitHub                                    | Email                 |
|------|-------------------------------------------|-----------------------|
| Dayven | [@daylenh](https://github.com/daylenh)  | dayven.lenh@sjsu.edu         |
| Mita | [@miiiyyi](https://github.com/miiiyyi)  | mita.yang@sjsu.edu   |
| Name 3 | [@smol-derp](https://github.com/smol-derp)          | jiajun.zheng@sjsu.edu |
| Yunfei | [@ychen1026](https://github.com/ychen1026) | yunfei.chen@sjsu.edu  |

**Advisor:** Carlos Rojas

---

## Problem Statement

University students often struggle with effectively planning their academic journey due to limited guidance and disconnected tools. Existing systems at SJSU, like MyPlanner and MyScheduler, allow students to see a set of required courses and generate semester schedules, but they are lacking when it comes to prerequisite validation, providing information on major/minor requirements, real-time class availability information, and the ability to simulate problems such as gap semesters or course failures. 

## Solution

An **interactive roadmap** will be built into a single, centralized academic planning platform that allows students to map out their desired entire path to graduation in one place. This project will focus on dynamically visualizing prerequisite relationships and the critical path that will determine the time to complete a degree. This information will help students clearly see what classes are more urgent, what classes contribute to completing a minor, and how delays or changes in their schedule can impact their graduation timeline.

### Key Features

- Dynamic Prerequisite Visualization: 
    - An interactive graph that displays course dependencies and highlights the critical path required for graduation.
- Real-Time Plan Adjustment:
    - Automatically update the interactive roadmap information based on user preferences.
- Critical Path Demonstration:
    - Visually marks the sequence of courses that directly determine degree completion rate.

---

## Demo

[Link to demo video or GIF]

**Live Demo:** [URL if deployed]

---

## Screenshots

| Feature | Screenshot |
|---------|------------|
| [Feature 1] | ![Screenshot](docs/screenshots/feature1.png) |
| [Feature 2] | ![Screenshot](docs/screenshots/feature2.png) |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | |
| Backend | |
| Database | |
| Deployment | |

---

## Getting Started

### Prerequisites

- [Prerequisite 1] v.X.X+
- [Prerequisite 2] v.X.X+

### Installation

```bash
# Clone the repository
git clone https://github.com/[org]/[repo].git
cd [repo]

# Install dependencies
[install command]

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations (if applicable)
[migration command]
```

### Running Locally

```bash
# Development mode
[dev command]

# The app will be available at http://localhost:XXXX
```

### Running Tests

```bash
[test command]
```

---

## API Reference

<details>
<summary>Click to expand API endpoints</summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resource` | Get all resources |
| GET | `/api/resource/:id` | Get resource by ID |
| POST | `/api/resource` | Create new resource |
| PUT | `/api/resource/:id` | Update resource |
| DELETE | `/api/resource/:id` | Delete resource |

</details>

---

## Project Structure

```
.
├── [folder]/           # Description
├── src/                # Source code files
├── tests/              # Test files
├── docs/               # Documentation files
└── README.md
```

---

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Use clear, descriptive commit messages:
- `Add user authentication endpoint`
- `Fix database connection timeout issue`
- `Update README with setup instructions`

---

## Acknowledgments

- [Resource/Library/Person]
- [Resource/Library/Person]

---

## License

This project is licensed under the <FILL IN> License - see the [LICENSE](LICENSE) file for details.

---

*CMPE 195A/B - Senior Design Project | San Jose State University | Spring 2026*
