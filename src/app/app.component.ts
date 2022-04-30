import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Employee } from './employee';
import { EmployeeService } from './employee.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  public employees: Employee[] = [];
  public editEmployee: Employee | null | undefined;
  public deleteEmployee: Employee | null | undefined;

  constructor(private employeeService: EmployeeService) { }

  ngOnInit(): void {
    this.getEmployees();
  }

  public getEmployees(): void {
    this.employeeService.getEmployees().subscribe(
      (response: Employee[]) => {
        console.log(response)
        this.employees = response;
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    )
  }

  /**
   * onOpenModal
   * 打开modal时的操作
   */
  public onOpenModal(employee: Employee | null | undefined, mode: string): void {
    const container = document.getElementById('main-container')
    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'none';
    button.setAttribute('data-toggle','modal');
    if (mode === 'add') {
    button.setAttribute('data-target','#addEmployeeModal');
    }
    if (mode === 'edit') {
      this.editEmployee = employee;
      button.setAttribute('data-target','#updateEmployeeModal');
    }
    if (mode === 'delete') {
      this.deleteEmployee = employee;
      button.setAttribute('data-target','#deleteEmployeeModal');
      }
    container?.appendChild(button);
    button.click();
  }

  /**
   * onAddEmloyee
   * 添加用户的方法
   */
  public onAddEmloyee(addForm: NgForm): void {
    // 当我们点击添加了之后，这个图层就应该被关闭了
    document.getElementById('add-employee-form')?.click();
    this.employeeService.addEmploye(addForm.value).subscribe(
      (response: Employee) => {
        console.log(response);
        this.getEmployees();
        addForm.reset();
      },
      (error: HttpErrorResponse) => {alert(error.message)}
    )
  }

  /**
   * onUpdateEmloyee
   * 修改用户信息的方法
   */
   public onUpdateEmloyee(employee: Employee): void {
    //employeeService调用updateEmploye方法，这里就已经修改了，然后我们再调用subscribe重新获取这个用户
    this.employeeService.updateEmploye(employee).subscribe(
      (response: Employee) => {
        console.log(response);
        this.getEmployees();
      },
      (error: HttpErrorResponse) => {alert(error.message)}
    )
  }

  /**
   * onDeleteEmloyee
   * 删除用户信息的方法
   */
   public onDeleteEmloyee(employeeId: number | undefined): void {
    this.employeeService.deleteEmployee(employeeId).subscribe(
      (response: void) => {
        console.log(response);
        this.getEmployees();
      },
      (error: HttpErrorResponse) => {alert(error.message)}
    )
  }

  /**
   * searchEmployees
   *
   */
  public searchEmployees(key: string) {
    const result: Employee[] = [];
    for(const employee of this.employees) {
      if (employee.name.toLowerCase().indexOf(key.toLowerCase()) !== -1
      || employee.email.toLowerCase().indexOf(key.toLowerCase()) !== -1
      || employee.phone.toLowerCase().indexOf(key.toLowerCase()) !== -1
      || employee.jobTitle.toLowerCase().indexOf(key.toLowerCase()) !== -1){
        result.push(employee)
      }
    }
    this.employees = result;
    if (result.length === 0 || !key) {
      this.getEmployees();
    }
  }
}
