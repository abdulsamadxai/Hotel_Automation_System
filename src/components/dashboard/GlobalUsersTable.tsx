import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGlobalStaff } from "@/hooks/useStaff";

export function GlobalUsersTable() {
    const { data: staff = [], isLoading } = useGlobalStaff();

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hotel Property</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staff.filter(Boolean).map((member: any, idx: number) => (
                    <TableRow key={member?.id || idx} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-medium">{member?.full_name || member?.name || "System"}</TableCell>
                        <TableCell>{member?.email || "—"}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <span className="capitalize">{(member?.role || 'user').replace('_', ' ')}</span>
                            </div>
                        </TableCell>
                        <TableCell>{member?.hotels?.name || "Global"}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={member?.status === 'on_duty' ? "bg-status-success/5 text-status-success border-status-success/20" : ""}>
                                {member?.status || 'inactive'}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
